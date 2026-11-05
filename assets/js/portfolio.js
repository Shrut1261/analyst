const filters = document.querySelector('.filters');
const buttons = [...filters.querySelectorAll('button')];
const projects = [...document.querySelectorAll('.index-grid .project-card')];
const search = document.querySelector('.project-search');
const query = search.querySelector('input');
const count = document.querySelector('.project-count');
const empty = document.querySelector('.empty-state');
const more = document.querySelector('.more-projects');
const pageSize = 6;

let category = 'all';
let limit = pageSize;

function renderProjects() {
  const words = query.value.toLowerCase().trim().split(/\s+/);
  let matches = 0;

  for (const project of projects) {
    const topicMatches = category === 'all' || project.dataset.tags.split(' ').includes(category);
    const text = project.textContent.toLowerCase();
    const textMatches = words.every(word => text.includes(word));
    const match = topicMatches && textMatches;

    if (match) matches += 1;
    project.hidden = !match || matches > limit;
  }

  const visible = Math.min(matches, limit);
  count.textContent = matches ? `Showing ${visible} of ${matches} matching projects` : '0 matching projects';
  empty.hidden = matches > 0;
  more.hidden = matches <= limit;
}

for (const activeButton of buttons) {
  activeButton.addEventListener('click', () => {
    category = activeButton.dataset.filter;
    limit = pageSize;
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(button === activeButton));
    }
    renderProjects();
  });
}

query.addEventListener('input', () => {
  limit = pageSize;
  renderProjects();
});

more.addEventListener('click', () => {
  const firstHiddenMatch = limit;
  limit += pageSize;
  renderProjects();
  const visibleProjects = projects.filter(project => !project.hidden);
  visibleProjects[firstHiddenMatch]?.querySelector('h4 a').focus();
});

renderProjects();
filters.hidden = false;
search.hidden = false;
count.hidden = false;

const copyLink = document.querySelector('[data-copy-link]');
const copyStatus = document.querySelector('.copy-status');
const publicUrl = document.querySelector('link[rel="canonical"]').href;

copyLink.hidden = false;
copyLink.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(publicUrl);
    copyStatus.textContent = 'Portfolio link copied.';
  } catch {
    const link = document.createElement('a');
    link.href = publicUrl;
    link.textContent = publicUrl;
    copyStatus.replaceChildren('Share this link: ', link);
  }
});
