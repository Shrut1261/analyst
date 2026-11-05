const filters = document.querySelector('.filters');
const buttons = [...filters.querySelectorAll('button')];
const projects = [...document.querySelectorAll('.index-grid .project-card')];
const search = document.querySelector('.project-search');
const query = search.querySelector('input');
const count = document.querySelector('.project-count');
const empty = document.querySelector('.empty-state');
const more = document.querySelector('.more-projects');
const resetProjects = document.querySelector('[data-reset-projects]');
const topicNames = new Map(buttons.map(button => [button.dataset.filter, button.textContent.trim()]));
const pageSize = 6;

let category = 'all';
let limit = pageSize;

function renderProjects() {
  const words = query.value.toLowerCase().trim().split(/\s+/);
  let matches = 0;

  for (const project of projects) {
    const tags = project.dataset.tags.split(' ');
    const topicMatches = category === 'all' || tags.includes(category);
    const topics = tags.map(tag => topicNames.get(tag) ?? tag).join(' ');
    const text = (project.textContent + ' ' + topics).toLowerCase();
    const textMatches = words.every(word => text.includes(word));
    const match = topicMatches && textMatches;

    if (match) matches += 1;
    project.hidden = !match || matches > limit;
  }

  const visible = Math.min(matches, limit);
  const noun = matches === 1 ? 'project' : 'projects';
  count.textContent = matches ? `Showing ${visible} of ${matches} matching ${noun}` : '0 matching projects';
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

resetProjects.addEventListener('click', () => {
  query.value = '';
  buttons.find(button => button.dataset.filter === 'all').click();
  query.focus();
});

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

const meetingCalendar = document.querySelector('.meeting-calendar');
const monthTitle = document.querySelector('#meeting-month');
const meetingDays = document.querySelector('.meeting-days');
const selection = document.querySelector('.meeting-selection');
const meetingEmail = document.querySelector('.meeting-email');
const meetingPhone = document.querySelector('.meeting-phone-link');
const previousMonth = meetingCalendar.querySelector('[data-month-step="-1"]');
const nextMonth = meetingCalendar.querySelector('[data-month-step="1"]');
const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const dateFormat = new Intl.DateTimeFormat('en-US', { dateStyle: 'full', timeZone: 'UTC' });
const easternDate = new Intl.DateTimeFormat('en-US', {
  year: 'numeric', month: 'numeric', day: 'numeric', timeZone: 'America/New_York'
});
const todayParts = Object.fromEntries(easternDate.formatToParts(new Date()).map(part => [part.type, part.value]));
const today = Date.UTC(Number(todayParts.year), Number(todayParts.month) - 1, Number(todayParts.day));
const firstMonth = Date.UTC(Number(todayParts.year), Number(todayParts.month) - 1);
function setMeetingBody(link, body) {
  const composeUrl = new URL(link.href);
  composeUrl.searchParams.set('body', body);
  link.href = composeUrl.href;
}
let visibleMonth = new Date(firstMonth);
let selectedDate;

function renderMeetingMonth() {
  monthTitle.textContent = monthFormat.format(visibleMonth);
  previousMonth.disabled = visibleMonth.getTime() <= firstMonth;
  meetingDays.replaceChildren();

  const year = visibleMonth.getUTCFullYear();
  const month = visibleMonth.getUTCMonth();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  for (let offset = 0; offset < visibleMonth.getUTCDay(); offset += 1) {
    meetingDays.append(document.createElement('span'));
  }

  for (let day = 1; day <= lastDay; day += 1) {
    const date = Date.UTC(year, month, day);
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = day;
    button.dataset.date = String(date);
    button.setAttribute('aria-label', dateFormat.format(date));
    button.setAttribute('aria-pressed', String(date === selectedDate));
    button.disabled = date < today;
    meetingDays.append(button);
  }
}

previousMonth.addEventListener('click', () => {
  visibleMonth.setUTCMonth(visibleMonth.getUTCMonth() - 1);
  renderMeetingMonth();
  if (previousMonth.disabled) nextMonth.focus();
});

nextMonth.addEventListener('click', () => {
  visibleMonth.setUTCMonth(visibleMonth.getUTCMonth() + 1);
  renderMeetingMonth();
});

meetingDays.addEventListener('click', event => {
  const button = event.target.closest('button[data-date]');
  if (!button) return;

  selectedDate = Number(button.dataset.date);
  const label = dateFormat.format(selectedDate);
  for (const day of meetingDays.querySelectorAll('button')) {
    day.setAttribute('aria-pressed', String(day === button));
  }
  selection.textContent = 'Preferred date: ' + label;
  const body = [
    'Hi Shrut,', '', 'I’d like to set up a meeting about:', '',
    'Preferred date: ' + label, 'Preferred time and time zone:', '', 'Thanks!'
  ].join('\r\n');
  setMeetingBody(meetingEmail, body);
  const phoneBody = [
    'Hi Shrut,', '', 'I’d like to set up a phone call about:', '',
    'Preferred date: ' + label, 'Preferred time and time zone:', 'Best number to reach me:', '', 'Thanks!'
  ].join('\r\n');
  setMeetingBody(meetingPhone, phoneBody);
});

renderMeetingMonth();
meetingCalendar.hidden = false;

function revealToolkitExperience() {
  const section = document.getElementById(location.hash.slice(1));
  if (section?.matches('details.timeline-item')) section.open = true;
}

window.addEventListener('hashchange', revealToolkitExperience);
revealToolkitExperience();

const discordCopy = document.querySelector('.discord-copy');
const discordStatus = document.querySelector('.discord-status');

discordCopy?.addEventListener('click', async () => {
  const username = discordCopy.querySelector('small').textContent.trim();
  try {
    await navigator.clipboard.writeText(username);
    discordStatus.textContent = 'Username copied. Paste it into Add Friend on Discord.';
  } catch {
    discordStatus.textContent = 'Enter ' + username + ' under Add Friend on Discord.';
  }
});
