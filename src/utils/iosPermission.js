export function requestIOSMotionPermission(enableOrientationCallback, fallbackCallback) {
    const wrapper = document.createElement('div');
    wrapper.id = 'motion-permission-window';
  
    const message = document.createElement('p');
    message.textContent = 'i am usually more of a surprise kind of guy, but i need to ask your permission in this case. Can i use your device motion sensor?';
  
    const btnFun = document.createElement('button');
    btnFun.textContent = 'yes (fun)';
    btnFun.className = 'btn-option';
  
    const btnNormal = document.createElement('button');
    btnNormal.textContent = 'no (less fun maybe)';
    btnNormal.className = 'btn-option1';
    
  
    btnFun.addEventListener('click', () => {
      wrapper.remove();
      enableOrientationCallback(); // request motion + enable
    });
  
    btnNormal.addEventListener('click', () => {
      wrapper.remove();
      fallbackCallback(); // just call normal gravity
    });
  
    wrapper.appendChild(message);
    wrapper.appendChild(btnFun);
    wrapper.appendChild(btnNormal);
    document.body.appendChild(wrapper);
  }
  