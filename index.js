const API_URL = 'https://crm.skch.cz/ajax0/procedure.php';

let vybranyUzivatel = "";
let poctyNapoju = {};

window.onload = function() {
    document.getElementById('userSelect').onchange = function() {
        vybratUzivatele(this.value);
    };
    document.getElementById('submitBtn').onclick = odeslatData;

    nactiUzivatele();
    nactiNapoje();
    zkontrolujPamet();

    poslatOfflineData();
    window.addEventListener('online', poslatOfflineData);
};

function vybratUzivatele(id) {
    vybranyUzivatel = id;
    localStorage.setItem('posledniUzivatel', id);
    document.cookie = "posledniUzivatel=" + id + "; path=/; max-age=" + (30*24*60*60);
    zkontrolujTlacitko();
}

async function nactiUzivatele() {
    let response = await fetch(API_URL + '?cmd=getPeopleList');
    let data = await response.json();
    let select = document.getElementById('userSelect');

    for (let klic in data) {
        let clovek = data[klic];
        let option = document.createElement('option');
        option.value = clovek.ID;
        option.innerHTML = clovek.name;
        select.appendChild(option);
    }
}

async function nactiNapoje() {
    let response = await fetch(API_URL + '?cmd=getTypesList');
    let data = await response.json();
    let seznam = document.getElementById('drinksList');

    seznam.innerHTML = "";

    for (let klic in data) {
        let typ = data[klic].typ.trim();
        poctyNapoju[typ] = 0;

        seznam.innerHTML += `
            <div class="drink-item">
                <span class="drink-name">${typ}</span>
                <div class="counter">
                    <button class="btn-counter minus" onclick="zmenitPocet('${typ}', -1)">-</button>
                    <span class="drink-value" id="val-${typ}">0</span>
                    <button class="btn-counter plus" onclick="zmenitPocet('${typ}', 1)">+</button>
                </div>
            </div>
        `;
    }
}

function zmenitPocet(typ, zmena) {
    poctyNapoju[typ] = poctyNapoju[typ] + zmena;

    if (poctyNapoju[typ] < 0) {
        poctyNapoju[typ] = 0;
    }

    document.getElementById('val-' + typ).innerHTML = poctyNapoju[typ];
    zkontrolujTlacitko();
}

function zkontrolujPamet() {
    let ulozeneId = localStorage.getItem('posledniUzivatel');

    if (ulozeneId != null) {
        vybranyUzivatel = ulozeneId;
        document.getElementById('userSelect').value = ulozeneId;
        zkontrolujTlacitko();
    }
}

function zkontrolujTlacitko() {
    let tlacitko = document.getElementById('submitBtn');
    let mameUzivatele = false;
    let mameNapoje = false;

    if (vybranyUzivatel !== "") {
        mameUzivatele = true;
    }

    for (let typ in poctyNapoju) {
        if (poctyNapoju[typ] > 0) {
            mameNapoje = true;
        }
    }

    tlacitko.disabled = !(mameUzivatele === true && mameNapoje === true);
}

async function odeslatData() {
    let tlacitko = document.getElementById('submitBtn');
    tlacitko.disabled = true;

    let odesilaneNapoje = [];
    for (let typ in poctyNapoju) {
        if (poctyNapoju[typ] > 0) {
            odesilaneNapoje.push({
                "type": typ,
                "value": poctyNapoju[typ]
            });
        }
    }

    let payload = {
        "user": vybranyUzivatel,
        "drinks": odesilaneNapoje
    };

    if (navigator.onLine === false) {
        let fronta = localStorage.getItem('offlineFronta');
        if (fronta == null) {
            fronta = "[]";
        }

        let frontaPole = JSON.parse(fronta);
        frontaPole.push(payload);
        localStorage.setItem('offlineFronta', JSON.stringify(frontaPole));

        alert("Jsi offline! Káva se uložila a odešle se, až zapneš internet.");
        vynulovatNapoje();
        return;
    }

    try {
        let response = await fetch(API_URL + "?cmd=saveDrinks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            alert("Káva úspěšně odeslána na server!");
            vynulovatNapoje();
        } else {
            alert("Chyba serveru při ukládání.");
        }
    } catch (chyba) {
        alert("Něco se pokazilo. Možná vypadl signál při odesílání.");
    }

    zkontrolujTlacitko();
}

function vynulovatNapoje() {
    for (let typ in poctyNapoju) {
        poctyNapoju[typ] = 0;
        document.getElementById('val-' + typ).innerHTML = "0";
    }
    zkontrolujTlacitko();
}

async function poslatOfflineData() {
    if (navigator.onLine === false) return;

    let fronta = localStorage.getItem('offlineFronta');
    if (fronta == null || fronta === "[]") return;

    let frontaPole = JSON.parse(fronta);

    for (let i = 0; i < frontaPole.length; i++) {
        await fetch(API_URL + "?cmd=saveDrinks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(frontaPole[i])
        });
    }

    localStorage.setItem('offlineFronta', "[]");
    alert("Byl jsi připojen k internetu. Staré uložené záznamy se odeslaly!");
}