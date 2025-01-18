import Technician from './Technician';
import AppModel from '../model/AppModel';

export default class App {
	#technicians = [];
	#requests = [];

	onEscapeKeydown = (event) => {
		if (event.key === 'Escape') {
			const input = document.querySelector('.technician-adder__input');
			input.style.display = 'none';
			input.value = '';

			document.querySelector('.technician-adder__btn').style.display = 'inherit';
		}
	};

	onDropRequestInTechnician = async (evt) => {
		evt.stopPropagation();

		const destTechnicianElement = evt.currentTarget;
		destTechnicianElement.classList.remove('technician_droppable');

		const movedRequestID = localStorage.getItem('movedRequestID');
		const srcTechnicianID = localStorage.getItem('srcTechnicianID');
		const destTechnicianID = destTechnicianElement.getAttribute('id');

		localStorage.setItem('movedRequestID', '');
		localStorage.setItem('srcTechnicianID', '');

		if (!destTechnicianElement.querySelector(`[id="${movedRequestID}"]`)) return;

		const srcTechnician = this.#technicians.find((tech) => tech.technicianID === srcTechnicianID);
		const destTechnician = this.#technicians.find((tech) => tech.technicianID === destTechnicianID);
		const movedRequest = srcTechnician.getRequestById({ requestID: movedRequestID });

		try {
			if (srcTechnicianID !== destTechnicianID) {
				await AppModel.moveRequest({ requestID: movedRequestID, srcTechnicianID, destTechnicianID });

				srcTechnician.deleteRequest({ requestID: movedRequestID });
				destTechnician.pushRequest({ request: movedRequest });
			}
			this.addNotification({ text: `Заявка ${movedRequestID} успешно перемещена`, type: 'success' });
		} catch (err) {
			this.addNotification({ text: err.message, type: 'error' });
			console.error(err);
		}
	};

	editTechnician = async ({ technicianID, newName }) => {
		const technician = this.#technicians.find((tech) => tech.technicianID === technicianID);
		const currentName = technician.name;

		if (!currentName || newName === currentName) return;

		try {
			await AppModel.updateTechnician({ technicianID, fullName: newName });
			technician.name = newName;
			document.querySelector(`[id="${technicianID}"] span.technician__name`).innerHTML = newName;
		} catch (err) {
			this.addNotification({ text: err.message, type: 'error' });
			console.error(err);
		}
	};

	deleteRequest = async ({ requestID }) => {
		let foundTechnician = null;
		let foundRequest = null;

		for (let technician of this.#technicians) {
			foundTechnician = technician;
			foundRequest = technician.getRequestById({ requestID });
			if (foundRequest) break;
		}

		try {
			await AppModel.deleteRequest({ requestID });
			foundTechnician.deleteRequest({ requestID });
			document.getElementById(requestID).remove();
			this.addNotification({ text: `Request ${requestID} deleted successfully`, type: 'success' });
		} catch (err) {
			this.addNotification({ text: err.message, type: 'error' });
			console.error(err);
		}
	};

	initAddTechnicianModal() {
		const addTechnicianModal = document.getElementById('modal-add-technician');

		const cancelHandler = () => {
			addTechnicianModal.close();
			addTechnicianModal.querySelector('.app-modal__input').value = '';
		};

		const okHandler = async () => {
			const technicianID = crypto.randomUUID();
			const modalInput = document.getElementById('modal-add-technician-input');
			if (modalInput.value) {
				try {
					const addTechnicianResult = await AppModel.addTechnician({
						technicianID,
						fullName: modalInput.value,
					});

					const newTechnician = new Technician({
						technicianID,
						name: modalInput.value,
						onDropRequestInTechnician: this.onDropRequestInTechnician,
						addNotification: this.addNotification,
					});

					this.#technicians.push(newTechnician);
					newTechnician.render();

					this.addNotification({ text: addTechnicianResult.message, type: 'success' });
				} catch (err) {
					this.addNotification({ text: err.message, type: 'error' });
					console.error(err);
				}
			}
			cancelHandler();
		};

		addTechnicianModal.querySelector('.modal-ok-btn').addEventListener('click', okHandler);
		addTechnicianModal.querySelector('.modal-cancel-btn').addEventListener('click', cancelHandler);
		addTechnicianModal.addEventListener('close', cancelHandler);
	}

	initAddRequestModal() {
		const addRequestModal = document.getElementById("modal-add-request");
	
		const cancelHandler = () => {
			addRequestModal.close();
			localStorage.setItem("addRequestTechnicianID", "");
		};
	
		const okHandler = async () => {
			const requestID = crypto.randomUUID();
			const address = document.getElementById("modal-add-request-address").value;
			const complexity = parseInt(document.getElementById("modal-add-request-complexity").value);
			const technicianID = localStorage.getItem("addRequestTechnicianID");
	
			console.log("Данные перед отправкой запроса:", { requestID, address, complexity, technicianID });
	
			if (!address || !technicianID) {
				console.error("Ошибка: Некорректные данные заявки");
				return;
			}
	
			try {
				const response = await fetch("http://localhost:8080/requests", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ requestID, address, complexity, technicianID })
				});
	
				console.log("Статус ответа сервера:", response.status);

				let data = null;
				if (response.headers.get("content-length") !== "0") {
					data = await response.json();
				}
		
				if (response.ok) {
					this.addNotification({ text: `Заявка успешно добавлена`, type: "success" });
		
					const technician = this.#technicians.find(t => t.technicianID === technicianID);
					if (technician) {
						technician.addNewRequestLocal({ requestID, address, complexity });
					}
				} else {
					this.addNotification({ text: `Ошибка: ${data?.message || "Неизвестная ошибка"}`, type: "error" });
				}
			} catch (error) {
				console.error("Ошибка запроса:", error);
				this.addNotification({ text: "Ошибка сети при добавлении заявки", type: "error" });
			}
		
			addRequestModal.close();
		};
	
		addRequestModal.querySelector(".modal-ok-btn").addEventListener("click", okHandler);
		addRequestModal.querySelector(".modal-cancel-btn").addEventListener("click", cancelHandler);
		addRequestModal.addEventListener("close", cancelHandler);
	}
	
	
	initEditTechnicianModal() {
		const editTechnicianModal = document.getElementById('modal-edit-technician');

		const cancelHandler = () => {
			editTechnicianModal.close();
			localStorage.setItem('editRequestID', '');
			editTechnicianModal.querySelector('.app-modal__input').value = '';
		};

		const okHandler = () => {
			const technicianID = localStorage.getItem('editTechnicianID');
			const modalInput = document.getElementById('modal-edit-technician-input');
			if (technicianID && modalInput.value) {
				this.editTechnician({ technicianID, newName: modalInput.value });
			}
			cancelHandler();
		};

		editTechnicianModal.querySelector('.modal-ok-btn').addEventListener('click', okHandler);
		editTechnicianModal.querySelector('.modal-cancel-btn').addEventListener('click', cancelHandler);
		editTechnicianModal.addEventListener('close', cancelHandler);
	}

	initDeleteRequestModal() {
		const deleteRequestModal = document.getElementById('modal-delete-request');

		const cancelHandler = () => {
			deleteRequestModal.close();
			localStorage.setItem('deleteRequestID', '');
		};

		const okHandler = () => {
			const requestID = localStorage.getItem('deleteRequestID');
			if (requestID) {
				this.deleteRequest({ requestID });
			}
			cancelHandler();
		};

		deleteRequestModal.querySelector('.modal-ok-btn').addEventListener('click', okHandler);
		deleteRequestModal.querySelector('.modal-cancel-btn').addEventListener('click', cancelHandler);
		deleteRequestModal.addEventListener('close', cancelHandler);
	}

	initNotifications() {
		const notifications = document.getElementById('app-notifications');
		notifications.show();
	}

	addNotification = ({ text, type }) => {
		const notifications = document.getElementById('app-notifications');

		const notificationID = crypto.randomUUID();
		const notification = document.createElement('div');
		notification.classList.add(
			'notification',
			type === 'success' ? 'notification-success' : 'notification-error'
		);
		notification.setAttribute('id', notificationID);
		notification.innerHTML = text;

		notifications.appendChild(notification);

		setTimeout(() => { document.getElementById(notificationID).remove(); }, 5000);
	}

	async init() {

		document.querySelectorAll('.app-modal').forEach(modal => {
			modal.addEventListener('close', () => {
				modal.querySelectorAll('input, select').forEach(field => {
					if (field.tagName === 'SELECT') {
						field.selectedIndex = 0; // Сброс выбора в <select>
					} else {
						field.value = ''; // Очистка <input>
					}
				});
			});
		});
		
		document.querySelector('.technician-adder__btn')
			.addEventListener('click', (event) => {
				document.getElementById('modal-add-technician').showModal();
			});

		document.addEventListener('keydown', this.onEscapeKeydown);

		this.initAddRequestModal();
		this.initEditTechnicianModal();
		this.initDeleteRequestModal();
		this.initNotifications();
		this.initAddTechnicianModal();

		document.addEventListener('dragover', (evt) => {
			evt.preventDefault();

			const draggedElement = document.querySelector('.request.request_selected');
			const draggedElementPrevList = draggedElement.closest('.technician');

			const currentElement = evt.target;
			const prevDroppable = document.querySelector('.technician_droppable');
			let curDroppable = evt.target;
			while (!curDroppable.matches('.technician') && curDroppable !== document.body) {
				curDroppable = curDroppable.parentElement;
			}

			if (curDroppable !== prevDroppable) {
				if (prevDroppable) prevDroppable.classList.remove('technician_droppable');

				if (curDroppable.matches('.technician')) {
					curDroppable.classList.add('technician_droppable');
				}
			}

			if (!curDroppable.matches('.technician') || draggedElement === currentElement) return;

			if (curDroppable === draggedElementPrevList) {
				if (!currentElement.matches('.request')) return;

				const nextElement = (currentElement === draggedElement.nextElementSibling)
					? currentElement.nextElementSibling
					: currentElement;

				curDroppable.querySelector('.technician__requests-list')
					.insertBefore(draggedElement, nextElement);

				return;
			}

			if (currentElement.matches('.request')) {
				curDroppable.querySelector('.technician__requests-list')
					.insertBefore(draggedElement, currentElement);

				return;
			}

			if (!curDroppable.querySelector('.technician__requests-list').children.length) {
				curDroppable.querySelector('.technician__requests-list')
					.appendChild(draggedElement);
			}
		});

		try {
			const technicians = await AppModel.getTechnicians();
			console.log("Loaded technicians:", technicians); // <-- Debugging line
		
			if (!Array.isArray(technicians)) {
				throw new Error("Unexpected data format: technicians is not an array");
			}
		
			for (const technician of technicians) {
				if (!technician.technicianID || !technician.fullName) {
					console.error("Invalid technician data:", technician);
					continue;
				}
		
				const technicianObj = new Technician({
					technicianID: technician.technicianID,
					name: technician.fullName,
					onDropRequestInTechnician: this.onDropRequestInTechnician,
					addNotification: this.addNotification
				});
		
				this.#technicians.push(technicianObj);
				technicianObj.render();
				console.log("Technician Data:", technician);
				console.log("Requests Data:", technician.requests);
				if (Array.isArray(technician.requests)) {
					for (const request of technician.requests) {
						console.log("Existing request from API:", request);
						if (!request.requestID || !request.address || request.complexity == null) {
							console.error("Invalid request data:", request);
							continue;
						}
		
						technicianObj.addNewRequestLocal({
							requestID: request.requestID,
							address: request.address,
							complexity: request.complexity
						});
					}
				} else {
					console.warn(`Technician ${technician.fullName} has no requests array`);
				}
			}
		} catch (error) {
			this.addNotification({ text: error.message, type: 'error' });
			console.error("Error in init():", error);
		}		
	}
};
