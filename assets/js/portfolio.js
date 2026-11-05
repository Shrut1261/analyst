const filters = document.querySelector('.filters');
const buttons = [...filters.querySelectorAll('button')];
const projects = [...document.querySelectorAll('.archive-body .project-card')];
const count = document.querySelector('.project-count');

function filterProjects(activeButton) {
  const category = activeButton.dataset.filter;
  let visible = 0;

  for (const button of buttons) {
    button.setAttribute('aria-pressed', String(button === activeButton));
  }

  for (const project of projects) {
    const matches = category === 'all' || project.dataset.tags.split(' ').includes(category);
    project.hidden = !matches;
    visible += Number(matches);
  }

  count.textContent = `Showing ${visible} of ${projects.length} projects`;
}

for (const button of buttons) {
  button.addEventListener('click', () => filterProjects(button));
}

filterProjects(buttons[0]);
filters.hidden = false;
count.hidden = false;

const workflow = document.querySelector('.workflow-controls');
const workflowButtons = [...workflow.querySelectorAll('button')];
const workflowSummary = document.querySelector('.workflow-summary');
const stageDescriptions = {
  prepare: workflowSummary.textContent,
  model: 'Use forecasting, classification, and text analysis to surface patterns and score risk.',
  deliver: 'Publish dashboards and reports that help teams monitor performance and prioritize next steps.',
};

for (const activeButton of workflowButtons) {
  activeButton.addEventListener('click', () => {
    for (const button of workflowButtons) {
      button.setAttribute('aria-pressed', String(button === activeButton));
    }
    workflowSummary.textContent = stageDescriptions[activeButton.dataset.stage];
  });
}

workflow.hidden = false;
