const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav');

menu?.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  menu.setAttribute('aria-expanded', String(open));
});

document.querySelectorAll('.nav a').forEach(a => {
  a.addEventListener('click', () => {
    nav.classList.remove('open');
    menu?.setAttribute('aria-expanded', 'false');
  });
});

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

document.querySelectorAll('a[href^="#"]').forEach(link => {
  link.addEventListener('click', e => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
