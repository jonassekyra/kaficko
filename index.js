const API_BASE = 'https://crm.skch.cz/ajax0/procedure.php';

let state = {
    users: [],
    drinksData: [],
    selectedUser: null,
    drinkCounts: {}
};

const userSelect = document.getElementById('userSelect');
const drinksList = document.getElementById('drinksList');
const submitBtn = document.getElementById('submitBtn');
const notification = document.getElementById('notification');

async function init() {
    await loadUsers();
    await loadDrinks();
    loadRememberedUser();

    userSelect.addEventListener('change', (e) => {
        state.selectedUser = e.target.value;
        saveUserToStorage(state.selectedUser);
        validateForm();
    });

    submitBtn.addEventListener('click', submitData);
}

async function apiCall(cmd, options = {}) {
    try {
        const url = `${API_BASE}?cmd=${cmd}`;
        const response = await fetch(url, options);
        if (!response.ok) throw new Error('Chyba sítě');
        return await response.json();
    } catch (error) {
        showNotification(`Chyba API: ${error.message}`, true);
        return null;
    }
}

async function loadUsers() {
    const data = await apiCall('getPeopleList');
    if (!data) return;

    userSelect.innerHTML = '<option value="" disabled selected>Vyberte své jméno</option>';
    const usersArray = Object.values(data);

    usersArray.forEach(person => {
        const option = document.createElement('option');
        option.value = person.ID;
        option.textContent = person.name;
        userSelect.appendChild(option);
    });


}

async function loadDrinks() {
    const data = await apiCall('getTypesList');
    if (!data) return;


    drinksList.innerHTML = '';
    const drinksArray = Object.values(data);


    drinksArray.forEach(type => {

        const typName = type.typ;
        state.drinkCounts[typName] = 0;
        const item = document.createElement('div');
        item.className = 'drink-item';
        item.innerHTML = `
            <span class="drink-name">${typName}</span>
            <div class="counter">
                <button class="btn-counter minus" data-type="${typName}">-</button>
                <span class="drink-value" id="val-${typName}">0</span>
                <button class="btn-counter plus" data-type="${typName}">+</button>
            </div>
        `;
        drinksList.appendChild(item);
    });

    document.querySelectorAll('.btn-counter').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();

            const type = btn.getAttribute('data-type');
            const isPlus = btn.classList.contains('plus');

            if (isNaN(state.drinkCounts[type])) {
                state.drinkCounts[type] = 0;
            }

            if (isPlus) {
                state.drinkCounts[type]++;
            } else if (state.drinkCounts[type] > 0) {
                state.drinkCounts[type]--;
            }

            document.getElementById(`val-${type}`).textContent = state.drinkCounts[type];
            validateForm();
        });
    });
}


function saveUserToStorage(userId) {
    localStorage.setItem('lastUserId', userId);

    const d = new Date();
    d.setTime(d.getTime() + (30*24*60*60*1000));
    document.cookie = `lastUserId=${userId};expires=${d.toUTCString()};path=/`;
}

function loadRememberedUser() {
    let userId = null;

    userId = localStorage.getItem('lastUserId');

    if (!userId) {
        const name = "lastUserId=";
        const decodedCookie = decodeURIComponent(document.cookie);
        const ca = decodedCookie.split(';');
        for(let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1);
            if (c.indexOf(name) == 0) {
                userId = c.substring(name.length, c.length);
                break;
            }
        }
    }

    if (userId) {
        userSelect.value = userId;
        state.selectedUser = userId;
        validateForm();
    }
}


function validateForm() {
    const hasUser = !!state.selectedUser;
    const hasDrinks = Object.values(state.drinkCounts).some(count => count > 0);
    submitBtn.disabled = !(hasUser && hasDrinks);
}

async function submitData() {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Odesílám...';

    const payload = {
        user: state.selectedUser.toString(),
        drinks: Object.entries(state.drinkCounts).map(([type, value]) => ({
            type: type,
            value: value
        }))
    };

    try {
        const response = await fetch(`${API_BASE}?cmd=saveDrinks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showNotification('Úspěšně Odesláno!', false);
            resetDrinks();
        } else {
            throw new Error('Chyba při odesílání');
        }
    } catch (error) {
        showNotification('Něco se pokazilo. Zkuste to znovu.', true);
    } finally {
        submitBtn.textContent = 'Odeslat';
        validateForm();
    }
}

function resetDrinks() {
    for (let type in state.drinkCounts) {
        state.drinkCounts[type] = 0;
        document.getElementById(`val-${type}`).textContent = '0';
    }
    validateForm();
}

function showNotification(msg, isError) {
    notification.textContent = msg;
    notification.className = `notification ${isError ? 'error' : 'success'}`;
    notification.classList.remove('hidden');
    setTimeout(() => {
        notification.classList.add('hidden');
    }, 3000);
}

init();