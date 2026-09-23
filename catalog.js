(function () {
  const burger = document.getElementById('burger');
  const navLinks = document.getElementById('navLinks');
  burger.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    burger.classList.toggle('active', open);
    burger.setAttribute('aria-expanded', open);
  });
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => {
      navLinks.classList.remove('open');
      burger.classList.remove('active');
      burger.setAttribute('aria-expanded', 'false');
    });
  });

  const managerModal = document.getElementById('managerModal');
  const managerClose = document.getElementById('managerClose');
  const openManagerModal = () => { managerModal.classList.add('open'); managerModal.setAttribute('aria-hidden', 'false'); };
  const closeManagerModal = () => { managerModal.classList.remove('open'); managerModal.setAttribute('aria-hidden', 'true'); };
  document.getElementById('contactManagerBtn').addEventListener('click', openManagerModal);
  document.getElementById('headerManagerBtn').addEventListener('click', openManagerModal);
  managerClose.addEventListener('click', closeManagerModal);
  managerModal.addEventListener('click', (e) => { if (e.target === managerModal) closeManagerModal(); });
  document.querySelectorAll('.calc-cta').forEach(btn => {
    btn.addEventListener('click', (e) => { e.preventDefault(); openManagerModal(); });
  });

  const successModal = document.getElementById('successModal');
  const successModalTitle = document.getElementById('successModalTitle');
  const successModalText = document.getElementById('successModalText');
  window.openSuccessModal = (title, text) => {
    successModalTitle.textContent = title;
    successModalText.textContent = text;
    successModal.classList.add('open');
    successModal.setAttribute('aria-hidden', 'false');
  };
  const closeSuccessModal = () => { successModal.classList.remove('open'); successModal.setAttribute('aria-hidden', 'true'); };
  document.getElementById('successClose').addEventListener('click', closeSuccessModal);
  document.getElementById('successOkBtn').addEventListener('click', closeSuccessModal);
  successModal.addEventListener('click', (e) => { if (e.target === successModal) closeSuccessModal(); });

  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeManagerModal(); closeSuccessModal(); } });
})();
