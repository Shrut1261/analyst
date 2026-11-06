let
    // Set UsePublished to false and supply an exported CSV path if needed.
    UsePublished = true,
    CsvPath = "C:\CivicSignal\civicsignal-demand.csv",
    Source = if UsePublished then
        Web.Contents("https://raw.githubusercontent.com", [RelativePath="Shrut1261/analyst/civicsignal-data/demand.csv"])
        else File.Contents(CsvPath),
    Raw = Csv.Document(Source, [Delimiter=",", Encoding=65001, QuoteStyle=QuoteStyle.Csv]),
    Headers = Table.PromoteHeaders(Raw, [PromoteAllScalars=true]),
    Typed = Table.TransformColumnTypes(Headers, {{"day", type date}, {"borough", type text}, {"scenario", type text}, {"requests", Int64.Type}}, "en-US")
in
    Typed
