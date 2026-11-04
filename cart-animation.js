document.querySelectorAll('.add-to-cart').forEach(button => {
    let resetTimer;
    button.addEventListener('pointermove', event => {
        const rect = button.getBoundingClientRect();
        button.style.setProperty('--glass-x', `${((event.clientX - rect.left) / rect.width * 100).toFixed(1)}%`);
        button.style.setProperty('--glass-y', `${((event.clientY - rect.top) / rect.height * 100).toFixed(1)}%`);
    });
    button.addEventListener('pointerdown', () => {
        if (!button.classList.contains('active')) button.classList.add('pressed');
    });
    button.addEventListener('pointerup', () => button.classList.remove('pressed'));
    button.addEventListener('pointercancel', () => button.classList.remove('pressed'));
    button.addEventListener('click', event => {
        event.preventDefault();
        if (button.classList.contains('active')) return;
        clearTimeout(resetTimer);
        button.classList.remove('pressed');
        button.classList.add('active');
        resetTimer = setTimeout(() => button.classList.remove('active'), 4100);
    });
});