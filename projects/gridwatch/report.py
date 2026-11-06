"""Generate the editable Power BI project and its portable ZIP."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
from functools import lru_cache
from urllib.request import urlopen
import json
import sys

from jsonschema import Draft7Validator
from referencing import Registry, Resource

SCHEMA = 'https://developer.microsoft.com/json-schemas/fabric/item/report'
FACT = 'Hourly'
PAGE = '182f53b8a719c2718611'
CSV = 'https://raw.githubusercontent.com/Shrut1261/analyst/industry-project-data/gridwatch/hourly.csv'

COLUMNS = {
    'date': 'dateTime', 'hr_end': 'string', 'da_demand': 'double', 'rt_demand': 'double',
    'da_lmp': 'double', 'rt_lmp': 'double', 'occurrence': 'int64', 'spread': 'double',
    'load_error': 'double', 'absolute_spread': 'double', 'zone': 'string',
}
EXPRESSIONS = {
    'Hourly observations': ('COUNTROWS(Hourly)', '#,0'),
    'Mean absolute spread': ('AVERAGE(Hourly[absolute_spread])', '$0.00'),
    'Mean signed spread': ('AVERAGE(Hourly[spread])', '$0.00'),
    'Hours above $25 absolute': ('CALCULATE(COUNTROWS(Hourly), Hourly[absolute_spread] >= 25)', '#,0'),
}
M_TYPES = {'dateTime': 'type date', 'string': 'type text', 'double': 'type number', 'int64': 'Int64.Type'}
MAPPING = ', '.join('{"%s", %s}' % (name, M_TYPES[kind]) for name, kind in COLUMNS.items())
QUERY = [
    'let',
    f'    Source = Csv.Document(Web.Contents("{CSV}"), [Delimiter=",", Columns=11, Encoding=65001, QuoteStyle=QuoteStyle.Csv]),',
    '    Headers = Table.PromoteHeaders(Source, [PromoteAllScalars=true]),',
    f'    Typed = Table.TransformColumnTypes(Headers, {{{MAPPING}}}, "en-US")',
    'in',
    '    Typed',
]


def projection(kind, field):
    return {'field': {kind: {'Expression': {'SourceRef': {'Entity': FACT}}, 'Property': field}},
            'queryRef': f'{FACT}.{field}', 'nativeQueryRef': field, 'active': True}


def make_visual(index, visual_type, roles, position, title):
    x, y, width, height = position
    name = f'{index:020x}'
    title_object = {'properties': {'show': {'expr': {'Literal': {'Value': 'true'}}},
                                   'text': {'expr': {'Literal': {'Value': f"'{title}'"}}}}}
    return name, {'$schema': f'{SCHEMA}/definition/visualContainer/2.7.0/schema.json', 'name': name,
                  'position': {'x': x, 'y': y, 'z': index * 1000, 'width': width, 'height': height, 'tabOrder': index * 1000},
                  'visual': {'visualType': visual_type,
                             'query': {'queryState': {role: {'projections': [projection(*field) for field in fields]}
                                                      for role, fields in roles.items()}},
                             'visualContainerObjects': {'title': [title_object]}}}


@lru_cache
def schema_resource(uri):
    prefix = 'https://developer.microsoft.com/json-schemas/'
    if not uri.startswith(prefix):
        raise ValueError(f'Unexpected schema host: {uri}')
    path = uri.removeprefix(prefix)
    with urlopen(f'https://raw.githubusercontent.com/microsoft/json-schemas/main/{path}', timeout=30) as response:
        return Resource.from_contents(json.load(response))


def generate(output):
    output.mkdir(parents=True, exist_ok=True)
    report = 'GridWatch.Report'
    model = 'GridWatch.SemanticModel'
    definition = f'{report}/definition'
    page = f'{definition}/pages/{PAGE}'
    model_columns = [{'name': field, 'sourceColumn': field, 'dataType': kind, 'summarizeBy': 'none',
                      **({'formatString': 'yyyy-MM-dd'} if kind == 'dateTime' else {})}
                     for field, kind in COLUMNS.items()]
    measures = [{'name': name, 'expression': expression, 'formatString': fmt}
                for name, (expression, fmt) in EXPRESSIONS.items()]
    files = {
        'GridWatch.pbip': {'version': '1.0', 'artifacts': [{'report': {'path': report}}], 'settings': {'enableAutoRecovery': True}},
        f'{report}/definition.pbir': {'$schema': f'{SCHEMA}/definitionProperties/2.0.0/schema.json', 'version': '4.0',
                                     'datasetReference': {'byPath': {'path': f'../{model}'}}},
        f'{model}/definition.pbism': {'version': '1.0', 'settings': {}},
        f'{model}/model.bim': {'name': 'GridWatch', 'compatibilityLevel': 1601,
                              'model': {'culture': 'en-US', 'defaultPowerBIDataSourceVersion': 'powerBI_V3',
                                        'tables': [{'name': FACT, 'columns': model_columns, 'measures': measures,
                                                    'partitions': [{'name': FACT, 'mode': 'import',
                                                                    'source': {'type': 'm', 'expression': QUERY}}]}]}},
        f'{definition}/version.json': {'$schema': f'{SCHEMA}/definition/versionMetadata/1.0.0/schema.json', 'version': '2.0.0'},
        f'{definition}/report.json': {'$schema': f'{SCHEMA}/definition/report/3.0.0/schema.json',
                                     'themeCollection': {'baseTheme': {'name': 'CY24SU10', 'type': 'SharedResources',
                                                                       'reportVersionAtImport': {'visual': '2.1.0', 'report': '3.0.0', 'page': '2.0.0'}}},
                                     'resourcePackages': [{'name': 'SharedResources', 'type': 'SharedResources',
                                                           'items': [{'name': 'CY24SU10', 'path': 'BaseThemes/CY24SU10.json', 'type': 'BaseTheme'}]}]},
        f'{definition}/pages/pages.json': {'$schema': f'{SCHEMA}/definition/pagesMetadata/1.0.0/schema.json',
                                           'pageOrder': [PAGE], 'activePageName': PAGE},
        f'{page}/page.json': {'$schema': f'{SCHEMA}/definition/page/2.0.0/schema.json', 'name': PAGE,
                              'displayName': '2025 Electricity Price Spreads', 'displayOption': 'FitToPage', 'width': 1280, 'height': 760},
    }
    visuals = [
        ('slicer', {'Values': [('Column', 'zone')]}, (20, 20, 250, 300), 'Choose a load zone or the system series'),
        ('card', {'Values': [('Measure', 'Mean absolute spread')]}, (290, 20, 310, 105), 'Mean absolute spread per MWh'),
        ('card', {'Values': [('Measure', 'Hours above $25 absolute')]}, (620, 20, 310, 105), 'Zone-hours with a $25 or larger spread'),
        ('card', {'Values': [('Measure', 'Hourly observations')]}, (950, 20, 310, 105), 'Hourly observations'),
        ('lineChart', {'Category': [('Column', 'date')], 'Y': [('Measure', 'Mean absolute spread'), ('Measure', 'Mean signed spread')]},
         (290, 145, 970, 340), 'Daily mean price spread'),
        ('tableEx', {'Values': [('Column', 'zone'), *[('Measure', name) for name in EXPRESSIONS]]},
         (290, 505, 970, 230), 'Compare zones and system series'),
    ]
    for index, definition_args in enumerate(visuals, start=1):
        name, visual = make_visual(index, *definition_args)
        files[f'{page}/visuals/{name}/visual.json'] = visual
    registry = Registry(retrieve=schema_resource)
    for filename, payload in files.items():
        if '$schema' in payload:
            try:
                Draft7Validator(schema_resource(payload['$schema']).contents, registry=registry).validate(payload)
            except Exception as error:
                raise ValueError(f'Invalid Power BI definition: {filename}') from error
    with ZipFile(output / 'GridWatch-Power-BI.zip', 'w', compression=ZIP_DEFLATED) as bundle:
        for filename, payload in files.items():
            bundle.writestr(filename, json.dumps(payload, indent=2) + '\n')
        bundle.writestr('OPEN-FIRST.txt', 'Extract the entire archive, then open GridWatch.pbip in Power BI Desktop. '
                        'Choose Anonymous access to raw.githubusercontent.com if prompted and refresh to load the data. '
                        'Select one zone or the New England system series before interpreting totals.\n')
    print(f'GridWatch PBIP source: {len(files)} definitions and {len(visuals)} visuals', flush=True)


if __name__ == '__main__':
    generate(Path(sys.argv[1]))
