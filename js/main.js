document.addEventListener("DOMContentLoaded", function () {
  const contactForm = document.querySelector(".php-email-form");

  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const formData = new FormData(this);
      const loading = this.querySelector('.loading');
      const errorMessage = this.querySelector('.error-message');
      const sentMessage = this.querySelector('.sent-message');

      // Reset states
      loading.style.display = 'block';
      errorMessage.style.display = 'none';
      sentMessage.style.display = 'none';

      fetch(this.action, {
        method: 'POST',
        body: formData,
        headers: { 
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest' // Required header
        }
      })
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
      })
      .then(data => {
        loading.style.display = 'none';
        
        // Handle Formspree's response format
        if (data.ok || data.success) {
          sentMessage.style.display = 'block';
          setTimeout(() => {
            // Use absolute URL for redirect
            window.location.href = 'https://shrut1261.github.io/shrut-analytica/thanks?language=en';
          }, 2000);
        } else {
          throw new Error(data.error || 'Submission failed');
        }
      })
      .catch(error => {
        loading.style.display = 'none';
        errorMessage.style.display = 'block';
        errorMessage.textContent = error.message || 'An error occurred. Please try again.';
      });
    });
  }
});
