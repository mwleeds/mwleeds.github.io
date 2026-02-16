import { docReady } from './helpers';
import { Collapse } from 'bootstrap';

function getOffset(el) {
  const rect = el.getBoundingClientRect();
  return {
    top: rect.top + window.scrollY,
    left: rect.left + window.scrollX,
  };
}

function changeNavOnScroll(navbar) {
  const hiddenClass = 'navbar-hidden-top';
  const topNavCollapseClass = 'top-nav-collapse';
  if (navbar.classList.contains(hiddenClass)) {
    const offset = getOffset(navbar);
    if (offset.top > 50) {
      navbar.classList.add(topNavCollapseClass);
    } else {
      navbar.classList.remove(topNavCollapseClass);
    }
  }
}

docReady(() => {
  const navbar = document.getElementById('navbar');
  const navLinks = document.getElementsByClassName('nav-link');
  const collapseMenu = document.getElementById('navbar-main-collapse');

  // Only initialize if navbar exists
  if (!navbar) {
    return;
  }

  document.addEventListener("scroll", () => changeNavOnScroll(navbar));

  navbar.addEventListener('show.bs.collapse', (e) => {
    navbar.classList.add('is-expanded');
  });

  navbar.addEventListener('hide.bs.collapse', (e) => {
    navbar.classList.remove('is-expanded');
  });

  if (collapseMenu) {
    // Get or create the Bootstrap Collapse instance
    let bsCollapse = Collapse.getInstance(collapseMenu);
    if (!bsCollapse) {
      bsCollapse = new Collapse(collapseMenu, {
        toggle: false
      });
    }

    [...navLinks].forEach((link) => {
      link.addEventListener('click', (e) => {
        bsCollapse.hide();
      });
    });
  }
});