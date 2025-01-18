export default class AppModel {
    static async getTechnicians() {
        try {
            const response = await fetch('http://localhost:8080/technicians');
            const body = await response.json();

            if (!response.ok) {
                throw new Error(body.message || 'Не удалось получить данные о мастерах.');
            }

            return body.technicians;
        } catch (err) {
            console.error(err);
            return Promise.reject({
                timestamp: new Date().toISOString(),
                statusCode: 0,
                message: err.message,
            });
        }
    }

    static async addTechnician({ technicianID, fullName }) {
        try {
            const response = await fetch('http://localhost:8080/technicians', {
                method: 'POST',
                body: JSON.stringify({ technicianID, fullName }),
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.status !== 200) {
                const body = await response.json();
                return Promise.reject(body);
            }

            return {
                timestamp: new Date().toISOString(),
                message: `Мастер ${fullName} успешно добавлен`,
            };
        } catch (err) {
            return Promise.reject({
                timestamp: new Date().toISOString(),
                statusCode: 0,
                message: err.message,
            });
        }
    }

    static async addRequest({ requestID, address, complexity, technicianID }) {
        try {
            if (!requestID || !address || complexity < 1 || !technicianID) {
                throw new Error("Неверные данные запроса перед вызовом API.");
            }
            const response = await fetch("http://localhost:8080/requests", {
                method: "POST",
                body: JSON.stringify({ requestID, address, complexity, technicianID }),
                headers: { "Content-Type": "application/json" },
            });
    
            const result = await response.json();
    
            if (!response.ok) {
                throw new Error(result.message || "Не удалось добавить запрос.");
            }
    
            return { timestamp: new Date().toISOString(), message: `Запрос для ${address} был успешно добавлен` };
        } catch (err) {
            return Promise.reject({ timestamp: new Date().toISOString(), statusCode: 0, message: err.message });
        }
    }
    
    static async deleteTechnician({ technicianID }) {
        try {
            const response = await fetch(`http://localhost:8080/technicians/${technicianID}`, {
                method: "DELETE"
            });
    
            if (response.status !== 200) {
                const errorData = await response.json();
                return Promise.reject(errorData);
            }
    
            return { timestamp: new Date().toISOString(), message: `Мастер ${technicianID} успешно удалён` };
        } catch (error) {
            return Promise.reject({ timestamp: new Date().toISOString(), statusCode: 0, message: error.message });
        }
    }    

    static async updateTechnician({ technicianID, fullName }) {
        try {
            const response = await fetch(`http://localhost:8080/technicians/${technicianID}`, {
                method: 'PATCH',
                body: JSON.stringify({ fullName }),
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.status !== 200) {
                const body = await response.json();
                return Promise.reject(body);
            }

            return {
                timestamp: new Date().toISOString(),
                message: `Мастер ${fullName} успешно обновлён`,
            };
        } catch (err) {
            return Promise.reject({
                timestamp: new Date().toISOString(),
                statusCode: 0,
                message: err.message,
            });
        }
    }

    static async updateRequest({ requestID, address, complexity }) {
        try {
            const response = await fetch(`http://localhost:8080/requests/${requestID}`, {
                method: 'PATCH',
                body: JSON.stringify({ address, complexity }),
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.status !== 200) {
                const body = await response.json();
                return Promise.reject(body);
            }

            return {
                timestamp: new Date().toISOString(),
                message: `Запрос ${address} был успешно обновлён`,
            };
        } catch (err) {
            return Promise.reject({
                timestamp: new Date().toISOString(),
                statusCode: 0,
                message: err.message,
            });
        }
    }

    static async updateRequests({reorderedRequests = []} = {reorderedRequests: []}) {
        try {
            const updateRequestResponse = await fetch(`http://localhost:8080/requests`, {
                method: 'PATCH',
                body: JSON.stringify({ reorderedRequests }),
                headers: {
                    'Content-type': 'application/json'
                }
            })

            if (updateRequestResponse .status !== 200) {
                const updateRequestBody = await updateRequestResponse .json()
                return Promise.reject(updateRequestBody)
            }

            return {
                timestamp: new Date().toISOString(),
                message: `Порядок остановок был успешно изменен`
            }
        } catch(err) {
            return Promise.reject({
                timestamp: new Date().toISOString(),
                statusCode: 0,
                message: err.message
            })
        }
    }

    static async deleteRequest({ requestID }) {
        try {
            const response = await fetch(`http://localhost:8080/requests/${requestID}`, {
                method: 'DELETE',
            });

            if (response.status !== 200) {
                const body = await response.json();
                return Promise.reject(body);
            }

            return {
                timestamp: new Date().toISOString(),
                message: `Запрос ${requestID} был успешно удалён`,
            };
        } catch (err) {
            return Promise.reject({
                timestamp: new Date().toISOString(),
                statusCode: 0,
                message: err.message,
            });
        }
    }

    static async moveRequest({ requestID, srcTechnicianID, destTechnicianID }) {
        try {
            const response = await fetch('http://localhost:8080/technicians', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ requestID, srcTechnicianID, destTechnicianID }),
            });

            if (response.status !== 200) {
                const body = await response.json();
                return Promise.reject(body);
            }

            return {
                timestamp: new Date().toISOString(),
                message: `Запрос ${requestID} успешно перемещён`,
            };
        } catch (err) {
            return Promise.reject({
                timestamp: new Date().toISOString(),
                statusCode: 0,
                message: err.message,
            });
        }
    }
}
