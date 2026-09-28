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
  const TITLE_HELP = 'Оставьте свой номер, и\u00a0наши консультанты помогут Вам с\u00a0выбором!';
  const TITLE_CALC = 'Оставьте свой номер, и\u00a0наши консультанты помогут Вам рассчитать стоимость\u00a0заказа';
  // "заказать подобную" (in the model detail modal) — a dedicated title about connecting
  // with a consultant over that specific item, rather than the generic cost-calculation one.
  const TITLE_ORDER = 'Оставьте свой номер, и\u00a0наш консультант поможет оформить заказ на\u00a0похожее изделие';
  const managerTitle = document.getElementById('managerModalTitle');
  // calc = true for the «рассчитать стоимость» buttons: the window then talks about the price of the order
  const openManagerModal = (calc) => {
    if (managerTitle) managerTitle.textContent = calc === true ? TITLE_CALC : TITLE_HELP;
    managerModal.classList.add('open'); managerModal.setAttribute('aria-hidden', 'false');
  };
  const openManagerModalWithTitle = (title) => {
    if (managerTitle) managerTitle.textContent = title;
    managerModal.classList.add('open'); managerModal.setAttribute('aria-hidden', 'false');
  };
  const closeManagerModal = () => { managerModal.classList.remove('open'); managerModal.setAttribute('aria-hidden', 'true'); };
  document.getElementById('contactManagerBtn').addEventListener('click', () => openManagerModal(false));
  document.getElementById('headerManagerBtn').addEventListener('click', () => openManagerModal(false));
  managerClose.addEventListener('click', closeManagerModal);
  managerModal.addEventListener('click', (e) => { if (e.target === managerModal) closeManagerModal(); });
  document.querySelectorAll('.calc-cta').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      if (btn.id === 'modelModalCta') openManagerModalWithTitle(TITLE_ORDER);
      else openManagerModal(!btn.classList.contains('consult-cta'));
    });
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
