(() => {
  'use strict';
  const catalog = JSON.parse(document.querySelector('#catalog').textContent);
  const scenes = new Map(catalog.map(scene => [scene.id, scene]));
  const sections = [...document.querySelectorAll('.scene')];
  const contents = [...document.querySelectorAll('.contents a')];
  const cover = document.querySelector('#cover-film');
  const toggle = document.querySelector('#cover-toggle');
  const auto = !window.matchMedia('(prefers-reduced-motion: reduce)').matches && !navigator.connection?.saveData;
  let coverWanted = auto;
  let coverVisible = false;
  let activeFilm = null;
  const visited = new WeakSet();
  const fractions = new Map();

  function play(video) {
    const attempt = video.play();
    if (attempt) attempt.catch(() => {});
  }
  function mark(link, active) {
    if (active) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  }
  function displayMode(section, mode) {
    if (mode === section.dataset.mode) return;
    const film = section.querySelector('.film');
    const asset = scenes.get(section.id)[mode];
    const resume = !film.paused || (auto && activeFilm === film);
    section.dataset.mode = mode;
    section.querySelectorAll('.modes a').forEach(link => mark(link, link.dataset.mode === mode));
    film.pause();
    film.poster = asset.poster;
    film.width = asset.width;
    film.height = asset.height;
    film.setAttribute('aria-label', scenes.get(section.id).title + ' — ' + (mode === 'comparison' ? 'Real / Blender' : 'Walkthrough'));
    film.loop = mode === 'walkthrough';
    section.querySelector('.film-error').hidden = true;
    section.querySelector('.film-error a').href = asset.file;
    film.src = asset.file;
    film.load();
    if (resume) play(film);
  }
  function route(scroll = true) {
    const [rawId, requested] = location.hash.slice(1).split('/');
    const id = rawId === 'scannet1' ? 'cafe2' : rawId;
    if (!scenes.has(id)) return;
    const section = document.getElementById(id);
    displayMode(section, requested === 'walkthrough' ? requested : 'comparison');
    if (scroll) section.scrollIntoView({block: 'start'});
  }
  function updatePlayback() {
    if (document.hidden) {
      cover.pause();
      sections.forEach(section => section.querySelector('.film').pause());
      return;
    }
    if (coverWanted && coverVisible) play(cover);
    else cover.pause();
    let target = null;
    for (const [film, ratio] of fractions) {
      if (ratio > .3 && (!target || ratio > fractions.get(target))) target = film;
    }
    if (activeFilm && activeFilm !== target) activeFilm.pause();
    activeFilm = target;
    if (!target) return;
    const section = target.closest('.scene');
    contents.forEach(link => mark(link, link.dataset.scene === section.id));
    if (auto && !visited.has(target)) {
      visited.add(target);
      play(target);
    }
  }
  toggle.hidden = false;
  function coverLabel() {
    const label = cover.paused ? 'Play background' : 'Pause background';
    toggle.textContent = label;
    toggle.setAttribute('aria-label', label + ' video');
  }
  cover.addEventListener('play', coverLabel);
  cover.addEventListener('pause', coverLabel);
  toggle.addEventListener('click', () => {
    coverWanted = cover.paused;
    if (coverWanted) play(cover);
    else cover.pause();
  });
  for (const section of sections) {
    const film = section.querySelector('.film');
    film.addEventListener('play', () => {
      sections.forEach(other => {
        if (other !== section) other.querySelector('.film').pause();
      });
    });
    film.addEventListener('error', () => { section.querySelector('.film-error').hidden = false; });
  }
  document.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('.contents a, .modes a');
    if (!link) return;
    event.preventDefault();
    const section = link.closest('.scene');
    const hash = section ? link.hash : '#' + link.dataset.scene + '/comparison';
    if (location.hash !== hash) history.pushState(null, '', hash);
    route(!section);
  });
  window.addEventListener('hashchange', () => route());
  route();
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.target === cover) coverVisible = entry.intersectionRatio > .1;
        else fractions.set(entry.target, entry.intersectionRatio);
      }
      updatePlayback();
    }, {threshold: [0,.1,.3,.55,.8,1]});
    observer.observe(cover);
    sections.forEach(section => observer.observe(section.querySelector('.film')));
    document.addEventListener('visibilitychange', updatePlayback);
  }
})();
