fetch('header.html').then(r=>r.text()).then(t=>{
  document.getElementById('header').innerHTML=t;
  updateActiveNav();
  // Mobile menu toggle
  setTimeout(function() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if(mobileMenuBtn && mobileMenu) {
      mobileMenuBtn.onclick = () => {
        mobileMenu.classList.toggle('hidden');
      };
    }
  }, 100);
}).catch(error => {
  console.error('Error loading header:', error);
});
fetch('footer.html').then(r=>r.text()).then(t=>document.getElementById('footer').innerHTML=t); 





function updateActiveNav() {
  const path = location.pathname.split('/').pop() || 'index.html';
  
  // Handle desktop header logo visibility
  const desktopHeaderLogo = document.getElementById('desktop-header-logo');
  if(desktopHeaderLogo) {
    if(path === 'index.html') {
      desktopHeaderLogo.style.display = 'none';
    } else {
      desktopHeaderLogo.style.display = 'flex';
    }
  }
  
  // Clear all active states first
  document.querySelectorAll('.nav-icon-link, .mobile-nav-link').forEach(link => {
    link.classList.remove('active');
  });
  
  // Add active state to current page
  document.querySelectorAll('.nav-icon-link, .mobile-nav-link').forEach(link => {
    const href = link.getAttribute('href');
    if(href === path) {
      link.classList.add('active');
    }
  });
}