import Request from './Request';
import AppModel from '../model/AppModel';

export default class Technician {
    #requests = [];
    #technicianName = '';
    #technicianID = '';

    constructor({ technicianID = null, name, onDropRequestInTechnician, addNotification }) {
        this.#technicianName = name;
        this.#technicianID = technicianID || crypto.randomUUID();
        this.onDropRequestInTechnician = onDropRequestInTechnician;
        this.addNotification = addNotification;
    }

    get technicianID() {
        return this.#technicianID;
    }

    get name() {
        return this.#technicianName;
    }

    set name(value) {
        if (typeof value === 'string') {
            this.#technicianName = value;
        }
    }

    pushRequest = ({ request }) => this.#requests.push(request);

    getRequestById = ({ requestID }) => this.#requests.find(request => request.requestID === requestID);

    get requests() {
        return this.#requests;
    }

    deleteRequest = ({ requestID }) => {
        const index = this.#requests.findIndex(request => request.requestID === requestID);
        if (index === -1) return;
        return this.#requests.splice(index, 1)[0];
    };

    async deleteTechnician() {
        const modal = document.getElementById('modal-delete-technician');
        modal.showModal();

        modal.querySelector('.modal-ok-btn').addEventListener('click', async () => {
            modal.close();
            try {
                await AppModel.deleteTechnician({ technicianID: this.#technicianID });
                document.getElementById(this.#technicianID).remove();
                this.addNotification({ text: `Мастер "${this.#technicianName}" успешно удалён`, type: "success" });
            } catch (error) {
                this.addNotification({ text: `Ошибка: ${error.message}`, type: "error" });
                console.error(error);
            }
        });

        modal.querySelector('.modal-cancel-btn').addEventListener('click', () => {
            modal.close();
        });
    }

    async appendNewRequest({ address, complexity }) {
        try {
            if (!address || !complexity || complexity < 1) throw new Error('Неверные данные запроса. Требуется указать адрес и сложность.');

            const requestID = crypto.randomUUID();
            console.log("GСгенерированный идентификатор запроса:", requestID);

            const addRequestResult = await AppModel.addRequest({
                requestID,
                address,
                complexity,
                technicianID: this.#technicianID,
            });

            console.log("addRequestResult из API:", addRequestResult);

            this.addNewRequestLocal({ requestID, address, complexity });
            this.addNotification({ text: `✅ ${addRequestResult.message}`, type: 'success' });

        } catch (err) {
            console.error("Ошибка в appendNewRequest:", err);
            this.addNotification({ text: err.message, type: 'error' });
        }
    }

    addNewRequestLocal({ requestID = null, address, complexity }) {
        if (!requestID) requestID = crypto.randomUUID();
    
        const newRequest = new Request({ requestID, address, complexity });
        this.#requests.push(newRequest);
    
        const technicianElement = document.querySelector(`[id="${this.#technicianID}"] .technician__requests-list`);
        if (technicianElement) {
            technicianElement.appendChild(newRequest.render());
        } else {
            console.error(`Мастер ${this.#technicianID} не имеет списка запросов.`);
        }
    }
    

    render() {
        const liElement = document.createElement('li');
        liElement.classList.add('technicians-list__item', 'technician');
        liElement.setAttribute('id', this.#technicianID);

        liElement.addEventListener('dragstart', () => localStorage.setItem('srcTechnicianID', this.#technicianID));
        liElement.addEventListener('drop', this.onDropRequestInTechnician);

        const headerDiv = document.createElement('div');
        headerDiv.classList.add('technician-list__item-header');

        const nameSpan = document.createElement('span');
        nameSpan.classList.add('technician__name');
        nameSpan.textContent = this.#technicianName;

        const controlsDiv = document.createElement('div');
        controlsDiv.classList.add('technician__controls');

        const editBtn = document.createElement('button');
		editBtn.setAttribute('type', 'button');
		editBtn.classList.add('technician__edit-btn', 'edit-icon');
		editBtn.addEventListener('click', () => {
			localStorage.setItem('editTechnicianID', this.#technicianID)
			localStorage.setItem('requestsLength', this.#requests.length)
			document.getElementById('modal-edit-technician').showModal()
		});
        const deleteBtn = document.createElement('button');
        deleteBtn.setAttribute('type', 'button');
        deleteBtn.classList.add('technician__delete-btn', 'delete-icon');
        deleteBtn.addEventListener('click', () => this.deleteTechnician());
        
        controlsDiv.appendChild(deleteBtn);
        
        controlsDiv.appendChild(editBtn);
        headerDiv.appendChild(nameSpan);
        headerDiv.appendChild(controlsDiv);
        liElement.appendChild(headerDiv);

        const requestList = document.createElement('ul');
        requestList.classList.add('technician__requests-list');
        liElement.appendChild(requestList);

        const addRequestBtn = this.createButton('technician__add-request-btn', '➕ Добавить запрос', () => {
            localStorage.setItem('addRequestTechnicianID', this.#technicianID);
            document.getElementById('modal-add-request').showModal();
        });
        liElement.appendChild(addRequestBtn);

        document.querySelector('.technician-adder').parentElement.insertBefore(liElement, document.querySelector('.technician-adder'));
    }

    createButton(className, text, eventHandler) {
        const button = document.createElement('button');
        button.setAttribute('type', 'button');
        button.classList.add(className);
        button.textContent = text;
        button.addEventListener('click', eventHandler);
        return button;
    }
}
