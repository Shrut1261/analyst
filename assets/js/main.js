(() => {
  "use strict";

  // Helper functions for querying elements
  const qs = (selector, parent = document) => parent.querySelector(selector);
  const qsa = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));

  // HEADER TOGGLE
  const header = qs("#header");
  const headerToggleBtn = qs(".header-toggle");

  const toggleHeader = () => {
    header?.classList.toggle("header-show");
    headerToggleBtn?.classList.toggle("bi-list");
    headerToggleBtn?.classList.toggle("bi-x");
  };
  headerToggleBtn?.addEventListener("click", toggleHeader);

  // Hide mobile nav on same-page/hash links
  qsa("#navmenu a").forEach(link => {
    link.addEventListener("click", () => {
      if (qs(".header-show")) toggleHeader();
    });
  });

  // Toggle mobile nav dropdowns
  qsa(".navmenu .toggle-dropdown").forEach(item => {
    item.addEventListener("click", e => {
      e.preventDefault();
      const parent = e.currentTarget.parentNode;
      parent.classList.toggle("active");
      parent.nextElementSibling?.classList.toggle("dropdown-active");
      e.stopImmediatePropagation();
    });
  });

  // PRELOADER
  const preloader = qs("#preloader");
  if (preloader) {
    window.addEventListener("load", () => preloader.remove());
  }

  // SCROLL TOP BUTTON
  const scrollTop = qs(".scroll-top");
  const toggleScrollTop = () => {
    if (scrollTop) {
      scrollTop.classList.toggle("active", window.scrollY > 100);
    }
  };

  scrollTop?.addEventListener("click", e => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  window.addEventListener("load", toggleScrollTop);
  document.addEventListener("scroll", toggleScrollTop);

  // ANIMATION ON SCROLL (AOS) INIT
  window.addEventListener("load", () => {
    if (typeof AOS !== "undefined") {
      AOS.init({
        duration: 600,
        easing: "ease-in-out",
        once: true,
        mirror: false,
      });
    }
  });

  // INIT TYPED.JS
  const typedEl = qs(".typed");
  if (typedEl && typeof Typed !== "undefined") {
    const typedStrings = typedEl.getAttribute("data-typed-items")?.split(",") || [];
    new Typed(".typed", {
      strings: typedStrings,
      loop: true,
      typeSpeed: 100,
      backSpeed: 50,
      backDelay: 2000,
    });
  }

  // INIT PURE COUNTER
  if (typeof PureCounter !== "undefined") {
    new PureCounter();
  }

  // Animate skills items on reveal using Waypoints
  qsa(".skills-animation").forEach(item => {
    if (typeof Waypoint !== "undefined") {
      new Waypoint({
        element: item,
        offset: "80%",
        handler: () => {
          qsa(".progress .progress-bar", item).forEach(el => {
            el.style.width = `${el.getAttribute("aria-valuenow")}%`;
          });
        },
      });
    }
  });

  // INIT GLIGHTBOX
  if (typeof GLightbox !== "undefined") {
    GLightbox({ selector: ".glightbox" });
  }

  // INIT ISOTOPE LAYOUT AND FILTERS
  qsa(".isotope-layout").forEach(isotopeItem => {
    const layout = isotopeItem.getAttribute("data-layout") || "masonry";
    const defaultFilter = isotopeItem.getAttribute("data-default-filter") || "*";
    const sort = isotopeItem.getAttribute("data-sort") || "original-order";

    let isoInstance;
    const isoContainer = qs(".isotope-container", isotopeItem);
    if (isoContainer && typeof imagesLoaded !== "undefined" && typeof Isotope !== "undefined") {
      imagesLoaded(isoContainer, () => {
        isoInstance = new Isotope(isoContainer, {
          itemSelector: ".isotope-item",
          layoutMode: layout,
          filter: defaultFilter,
          sortBy: sort,
        });
      });
    }

    qsa(".isotope-filters li", isotopeItem).forEach(filterBtn => {
      filterBtn.addEventListener("click", () => {
        const currentActive = qs(".filter-active", isotopeItem);
        currentActive?.classList.remove("filter-active");
        filterBtn.classList.add("filter-active");
        isoInstance?.arrange({ filter: filterBtn.getAttribute("data-filter") });
        if (typeof AOS !== "undefined") AOS.refresh();
      });
    });
  });

  // INIT SWIPER SLIDERS
  const initSwiper = () => {
    qsa(".init-swiper").forEach(swiperElement => {
      const configEl = qs(".swiper-config", swiperElement);
      if (configEl && typeof Swiper !== "undefined") {
        let config;
        try {
          config = JSON.parse(configEl.innerHTML.trim());
        } catch (err) {
          console.error("Invalid Swiper configuration", err);
          return;
        }
        if (swiperElement.classList.contains("swiper-tab") && typeof initSwiperWithCustomPagination === "function") {
          initSwiperWithCustomPagination(swiperElement, config);
        } else {
          new Swiper(swiperElement, config);
        }
      }
    });
  };
  window.addEventListener("load", initSwiper);

  // CORRECT SCROLLING POSITION ON PAGE LOAD FOR HASH LINKS
  window.addEventListener("load", () => {
    if (window.location.hash) {
      const section = qs(window.location.hash);
      if (section) {
        setTimeout(() => {
          const scrollMarginTop = parseInt(getComputedStyle(section).scrollMarginTop, 10) || 0;
          window.scrollTo({ top: section.offsetTop - scrollMarginTop, behavior: "smooth" });
        }, 100);
      }
    }
  });

  // NAVMENU SCROLLSPY
  const navLinks = qsa(".navmenu a");
  const navScrollspy = () => {
    const pos = window.scrollY + 200;
    navLinks.forEach(link => {
      if (!link.hash) return;
      const section = qs(link.hash);
      if (!section) return;
      if (pos >= section.offsetTop && pos <= section.offsetTop + section.offsetHeight) {
        qsa(".navmenu a.active").forEach(active => active.classList.remove("active"));
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });
  };
  window.addEventListener("load", navScrollspy);
  document.addEventListener("scroll", navScrollspy);

  // CONTACT FORM SUBMISSION HANDLER
  const emailForm = qs(".php-email-form");
  if (emailForm) {
    emailForm.addEventListener("submit", e => {
      e.preventDefault();
      const formData = new FormData(emailForm);

      // Optionally show a loading message
      const loadingMessage = document.createElement("p");
      loadingMessage.textContent = "Sending...";
      emailForm.appendChild(loadingMessage);

      fetch(emailForm.getAttribute("action"), {
        method: "POST",
        body: formData,
      })
        .then(response => response.json())
        .then(data => {
          loadingMessage.remove();
          if (data.ok) {
            // Redirect to the thanks page if submission is successful
            window.location.href = data.next || "/thanks";
          } else {
            alert("There was a problem with your submission. Please try again.");
          }
        })
        .catch(error => {
          loadingMessage.remove();
          console.error("Submission Error:", error);
          alert("There was an error submitting your form.");
        });
    });
  }
})();
