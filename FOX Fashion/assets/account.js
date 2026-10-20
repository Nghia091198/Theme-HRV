(function () {
  'use strict';
  const root = document.querySelector('.fox-account');
  if (!root) return;
  root.dataset.accountReady = 'true';

  const profileLink = root.querySelector('.fox-account-nav__item[href="/account"]');
  const ordersLink = root.querySelector('.fox-account-nav__item[href="/account#customer_orders"]');
  function syncAccountNav() {
    const ordersActive = window.location.hash === '#customer_orders';
    profileLink?.classList.toggle('is-active', !ordersActive);
    ordersLink?.classList.toggle('is-active', ordersActive);
    if (ordersActive) {
      profileLink?.removeAttribute('aria-current');
      ordersLink?.setAttribute('aria-current', 'location');
    } else {
      profileLink?.setAttribute('aria-current', 'page');
      ordersLink?.removeAttribute('aria-current');
    }
  }
  syncAccountNav();
  window.addEventListener('hashchange', syncAccountNav);

  const navStatus = root.querySelector('[data-account-nav-status]');
  root.querySelectorAll('[data-account-placeholder]').forEach((button) => {
    button.addEventListener('click', () => { if (navStatus) navStatus.textContent = 'Tính năng đang được phát triển'; });
  });

  const birthday = root.querySelector('[data-account-date-picker]');
  if (birthday && typeof window.flatpickr === 'function') window.flatpickr(birthday, { allowInput: true, dateFormat: 'd/m/Y', disableMobile: true });

  const form = root.querySelector('[data-account-form]')?.closest('form');
  if (!form) return;
  const panel = root.querySelector('[data-account-profile]');
  const submit = form.querySelector('[data-account-submit]');
  const submitLabel = form.querySelector('[data-account-submit-label]');
  const status = form.querySelector('[data-account-form-status]');
  const phone = form.querySelector('#fox-account-phone');
  const firstName = form.querySelector('#fox-account-first-name');
  const lastName = form.querySelector('#fox-account-last-name');
  const addressForm = root.querySelector('.fox-account-address-sync form');
  let submitting = false;

  function setState(state, message) {
    if (panel) panel.dataset.state = state;
    form.setAttribute('aria-busy', String(state === 'loading'));
    if (submit) submit.disabled = state === 'loading';
    if (submitLabel) submitLabel.textContent = state === 'loading' ? 'Đang cập nhật...' : 'Cập nhật';
    if (status) status.textContent = message || '';
  }

  function isValidBirthday(value) {
    const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!match) return false;
    const day = Number(match[1]); const month = Number(match[2]); const year = Number(match[3]);
    const date = new Date(year, month - 1, day);
    return year >= 1900 && date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  }

  function validate() {
    if (!form.reportValidity()) return false;
    if (phone && !/^[+()\d\s.-]{8,20}$/.test(phone.value.trim())) { phone.setCustomValidity('Vui lòng nhập số điện thoại hợp lệ.'); phone.reportValidity(); phone.setCustomValidity(''); return false; }
    if (birthday && !isValidBirthday(birthday.value)) { birthday.setCustomValidity('Vui lòng nhập ngày sinh theo định dạng dd/mm/yyyy.'); birthday.reportValidity(); birthday.setCustomValidity(''); return false; }
    return true;
  }

  async function postForm(targetForm) {
    const formType = targetForm.querySelector('[name="form_type"]');
    const utf8 = targetForm.querySelector('[name="utf8"]');
    if (formType && !formType.value) formType.value = targetForm.id === 'update_customer' ? 'update_customer' : 'customer_address';
    if (utf8 && !utf8.value) utf8.value = '✓';
    const response = await fetch(targetForm.action || window.location.pathname, { method: (targetForm.method || 'post').toUpperCase(), body: new FormData(targetForm), credentials: 'same-origin', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
  }

  function syncAddressFields() {
    if (!addressForm) return;
    const values = { 'first-name': firstName?.value || '', 'last-name': lastName?.value || '', phone: phone?.value || '' };
    Object.entries(values).forEach(([key, value]) => { const input = addressForm.querySelector(`[data-address-sync="${key}"]`); if (input) input.value = value; });
  }

  form.addEventListener('submit', async (event) => {
    if (submitting || !validate()) { event.preventDefault(); setState(submitting ? 'loading' : 'error', submitting ? 'Yêu cầu đang được xử lý.' : 'Vui lòng kiểm tra lại các trường thông tin.'); if (status) status.focus(); return; }
    event.preventDefault(); submitting = true; setState('loading', 'Đang cập nhật thông tin...');
    try {
      await postForm(form);
      if (addressForm) { syncAddressFields(); await postForm(addressForm); }
      setState('success', 'Cập nhật thành công. Đang tải lại thông tin...');
      window.location.assign('/account');
    } catch (error) {
      console.warn('[FOXAccount] Unable to update customer profile.');
      submitting = false; setState('error', 'Không thể cập nhật lúc này. Vui lòng thử lại.'); if (status) status.focus();
    }
  });
})();
