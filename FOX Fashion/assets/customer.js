(function(){'use strict';
function initCustomer(root){
  if(!root||root.dataset.customerReady==='true')return;
  root.dataset.customerReady='true';
  var birthday=root.querySelector('[data-date-picker]');
  if(birthday&&typeof flatpickr==='function')flatpickr(birthday,{dateFormat:'m/d/Y',allowInput:true});
  root.querySelectorAll('[data-password-toggle]').forEach(function(button){button.classList.add('is-hidden');button.addEventListener('click',function(){var input=document.getElementById(button.dataset.passwordToggle);if(!input)return;var visible=input.type==='text';input.type=visible?'password':'text';button.classList.toggle('is-visible',!visible);button.classList.toggle('is-hidden',visible);button.setAttribute('aria-pressed',String(!visible));button.setAttribute('aria-label',visible?(button.dataset.labelShow||'Hiện mật khẩu'):(button.dataset.labelHide||'Ẩn mật khẩu'));});});
  var recover=root.querySelector('[data-customer-recover]'),login=root.querySelector('[data-customer-login]'),standard=root.querySelector('[data-customer-panel="login"]'),recovery=root.querySelector('[data-customer-panel="recover"]');
  if(recover&&standard&&recovery)recover.addEventListener('click',function(){standard.hidden=true;recovery.hidden=false;});
  if(login&&standard&&recovery)login.addEventListener('click',function(){recovery.hidden=true;standard.hidden=false;});
  var standardLogin=root.querySelector('[data-customer-standard-login]'),phonePanel=root.querySelector('[data-customer-otp-panel]');
  root.querySelectorAll('[data-customer-method]').forEach(function(button){button.addEventListener('click',function(){var phone=button.dataset.customerMethod==='phone';root.querySelectorAll('[data-customer-method]').forEach(function(item){item.classList.toggle('is-active',item===button);});if(standardLogin)standardLogin.hidden=phone;if(phonePanel)phonePanel.hidden=!phone;});});
  var phoneForm=root.querySelector('[data-customer-phone-form]'),otpForm=root.querySelector('[data-customer-otp-form]');
  if(phoneForm&&otpForm){window.On_PhoneAuthRecaptchaCallback=function(token){if(!token)return;var data=new FormData(phoneForm);fetch('/phone_auth/send_verify_code',{method:'POST',body:data,credentials:'same-origin'}).then(function(response){return response.json();}).then(function(payload){if(!payload||!payload.token)throw new Error('OTP token missing');otpForm.querySelector('[name="session_info"]').value=payload.token;phoneForm.hidden=true;otpForm.hidden=false;}).catch(function(){phoneForm.setAttribute('aria-invalid','true');});};}
}
document.querySelectorAll('.fox-customer').forEach(initCustomer);
})();
