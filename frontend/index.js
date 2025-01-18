import App from './components/App';

async function loadUser() {
    try {
        const response = await fetch('/user');
        if (!response.ok) throw new Error('Ошибка загрузки данных пользователя');

        const user = await response.json();

        const header = document.getElementById('app-header');

        const userContainer = document.createElement('div');
        userContainer.classList.add('user-info');

        const avatar = document.createElement('div');
        avatar.classList.add('user-info__avatar');
        avatar.style.backgroundImage = `url('${user.avatar}')`;

        const username = document.createElement('span');
        username.classList.add('user-info__username');
        username.textContent = user.username;

        userContainer.appendChild(avatar);
        userContainer.appendChild(username);

        header.appendChild(userContainer);
    } catch (error) {
        console.error('Ошибка загрузки пользователя:', error);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await loadUser();

    const app = new App();
    app.init();
});
