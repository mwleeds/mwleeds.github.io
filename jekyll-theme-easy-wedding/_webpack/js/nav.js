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

  // Only initialize if navbar exists
  if (!navbar) {
    return;
  }

  try {
    document.addEventListener("scroll", () => changeNavOnScroll(navbar));
  } catch (error) {
    console.warn('Error in scroll handler:', error);
  }
});