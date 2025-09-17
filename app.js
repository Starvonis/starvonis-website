document.addEventListener('DOMContentLoaded', function(){
  const navToggle = document.getElementById('navToggle');
  const mainNav = document.getElementById('mainNav');
  navToggle && navToggle.addEventListener('click', () => { mainNav.classList.toggle('show'); });

  const scrollContact = document.getElementById('scrollContact');
  if (scrollContact) {
    scrollContact.addEventListener('click', (e) => { e.preventDefault(); document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  }

  const animateEls = document.querySelectorAll('[data-animate]');
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('in'); obs.unobserve(entry.target); } });
  }, { threshold: 0.12 });
  animateEls.forEach(el => obs.observe(el));

  const modal = document.getElementById('modal');
  const modalTitle = document.getElementById('modalTitle');
  const modalText = document.getElementById('modalText');
  const modalClose = document.getElementById('modalClose');
  document.querySelectorAll('.open-modal').forEach(btn => {
    btn.addEventListener('click', () => {
      modalTitle.textContent = btn.dataset.title;
      modalText.textContent = btn.dataset.text;
      modal.classList.add('show');
      modal.setAttribute('aria-hidden', 'false');
    });
  });
  modalClose && modalClose.addEventListener('click', closeModal);
  modal && modal.addEventListener('click', (e)=> { if(e.target === modal) closeModal(); });
  function closeModal(){ modal.classList.remove('show'); modal.setAttribute('aria-hidden', 'true'); }

  const contactForm = document.getElementById('contactForm');
  const formMsg = document.getElementById('formMsg');
  const toast = document.getElementById('toast');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      formMsg.textContent = '';
      const form = e.currentTarget;
      const data = new FormData(form);
      const name = data.get('name')?.trim();
      const email = data.get('email')?.trim();
      const message = data.get('message')?.trim();
      if(!name || !email || !message) {
        formMsg.textContent = 'Please fill required fields (name, email, message).';
        return;
      }
      showToast('Sending message...');
      setTimeout(() => {
        showToast('Message sent. Thank you!');
        form.reset();
        formMsg.textContent = '';
      }, 1100);
    });
  }
  function showToast(text) { toast.textContent = text; toast.classList.add('show'); setTimeout(()=> toast.classList.remove('show'), 2500); }
  document.querySelectorAll('#mainNav a').forEach(a => a.addEventListener('click', ()=> mainNav.classList.remove('show')));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { if (modal && modal.classList.contains('show')) closeModal(); mainNav.classList.remove('show'); }
  });
});
