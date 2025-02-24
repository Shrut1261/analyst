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
          'X-Requested-With': 'XMLHttpRequest'
        }
      })
      .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
      })
      .then(data => {
        // Handle Formspree's response
        if (data.ok || data.success) {
          // Clean the redirect URL
          const redirectUrl = data.next 
            ? data.next.replace(' ', '') // Remove any accidental spaces
            : 'https://shrut1261.github.io/shrut-analytica/thanks?language=en';
            
          // Client-side redirect after 2 seconds
          setTimeout(() => {
            window.location.href = redirectUrl;
          }, 2000);
        } else {
          throw new Error(data.error || 'Submission failed');
        }
      })
      .catch(error => {
        console.error('Form submission error:', error);
        loading.style.display = 'none';
        errorMessage.textContent = 'Message sending failed. Please try again.';
        errorMessage.style.display = 'block';
      })
      .finally(() => {
        loading.style.display = 'none';
      });
    });
  }
});
