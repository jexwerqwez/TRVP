export default class Request {
    #requestID = '';
    #requestAddress = '';
    #requestComplexity = -1;

    constructor({ requestID = null, address, complexity }) {
        this.#requestID = requestID || crypto.randomUUID();
        this.#requestAddress = address;
        this.#requestComplexity = complexity;
    }
    

    get requestID() {
        return this.#requestID;
    }

    get requestAddress() {
        return this.#requestAddress;
    }

    set requestAddress(value) {
        if (typeof value === 'string') {
            this.#requestAddress = value;
        }
    }

    get requestComplexity() {
        return this.#requestComplexity;
    }

    set requestComplexity(value) {
        if (typeof value === 'number' && value > 0) {
            this.#requestComplexity = value;
        }
    }

    get complexityText() {
        if (this.#requestComplexity <= 10) {
            return 'простая';
        } else if (this.#requestComplexity <= 20) {
            return 'средняя';
        } else {
            return 'сложная';
        }
    }
    

    render() {
        const liElement = document.createElement('li');
        liElement.classList.add('technician__requests-list-item', 'request');
        liElement.setAttribute('id', this.#requestID);
        liElement.setAttribute('draggable', true);

        liElement.addEventListener('dragstart', (evt) => {
            evt.target.classList.add('request_selected');
            localStorage.setItem('movedRequestID', this.#requestID);
        });

        liElement.addEventListener('dragend', (evt) => evt.target.classList.remove('request_selected'));

        const span = document.createElement('span');
        span.classList.add('request__text');
        span.innerHTML = `${this.#requestAddress} (Сложность: ${this.complexityText})`;

        liElement.appendChild(span);

		const controlsDiv = document.createElement('div');
		controlsDiv.classList.add('request__controls');

		const lowerRowDiv = document.createElement('div');
		lowerRowDiv.classList.add('request__controls-row');

        const deleteBtn = document.createElement('button');
        deleteBtn.setAttribute('type', 'button');
        deleteBtn.classList.add('request__control-btn', 'delete-icon');
        deleteBtn.addEventListener('click', () => {
            localStorage.setItem('deleteRequestID', this.#requestID);
            const deleteRequestModal = document.getElementById('modal-delete-request');
            deleteRequestModal.querySelector('.app-modal__question').innerHTML =
                `Заявка '${this.#requestAddress}' будет удалена. Продолжить?`;
            deleteRequestModal.showModal();
        });

		lowerRowDiv.appendChild(deleteBtn);

		controlsDiv.appendChild(lowerRowDiv);

		liElement.appendChild(controlsDiv);
        return liElement;
    }
}
