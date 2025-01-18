import pg from 'pg';

export default class DB {
    #dbClient = null;
    #dbHost = '';
    #dbPort = '';
    #dbName = '';
    #dbLogin = '';
    #dbPassword = '';

    constructor() {
        this.#dbHost = process.env.DB_HOST;
        this.#dbPort = Number(process.env.DB_PORT);
        this.#dbName = process.env.DB_NAME;
        this.#dbLogin = process.env.DB_LOGIN;
        this.#dbPassword = process.env.DB_PASSWORD;

        console.log({
            DB_HOST: this.#dbHost,
            DB_PORT: this.#dbPort,
            DB_NAME: this.#dbName,
            DB_LOGIN: this.#dbLogin,
            DB_PASSWORD: this.#dbPassword,
        });

        if (!this.#dbHost || !this.#dbPort || !this.#dbName || !this.#dbLogin || !this.#dbPassword) {
            throw new Error('Отсутствие необходимых переменных окружения для подключения к базе данных');
        }

        this.#dbClient = new pg.Client({
            user: this.#dbLogin,
            password: this.#dbPassword,
            host: this.#dbHost,
            port: this.#dbPort,
            database: this.#dbName,
        });
    }

    async connect() {
        try {
            await this.#dbClient.connect();
            console.log('Соединение с БД установлено');
        } catch (error) {
            console.error('Невозможно подключиться к БД:', error);
            return Promise.reject(error);
        }
    }

    async disconnect() {
        await this.#dbClient.end();
        console.log('БД отключена');
    }

    async getTechnicians() {
        try {
            const technicians = await this.#dbClient.query(
                'SELECT * FROM masters ORDER BY id;'
            );
            return technicians.rows;
        } catch (error) {
            console.error('Невозможно получить мастеров:', error);
            return Promise.reject({
                type: 'internal',
                error,
            });
        }
    }

    async getRequests() {
        try {
            const requests = await this.#dbClient.query(
                'SELECT * FROM requests ORDER BY master_id;'
            );
            return requests.rows;
        } catch (error) {
            console.error('Невозможно получить заявки:', error);
            return Promise.reject({
                type: 'internal',
                error,
            });
        }
    }

    async addTechnician({ technicianID, fullName }) {
        if (!technicianID || !fullName) {
            return Promise.reject(new Error('Неверные параметры мастеров'));
        }
        try {
            await this.#dbClient.query(
                'INSERT INTO masters (id, full_name) VALUES ($1, $2);',
                [technicianID, fullName]
            );
        } catch (error) {
            console.error('Невозможно добавить мастера:', error);
            return Promise.reject(error);
        }
    }

    async addRequest({ requestID, address, complexity, technicianID }) {
        if (!requestID || !address || complexity <= 0 || !technicianID) {
            return Promise.reject(new Error('Неверные параметры заявок'));
        }
        try {
            await this.#dbClient.query('BEGIN');

            const { rows: allRequests } = await this.#dbClient.query(
                "SELECT id, complexity FROM requests WHERE master_id = $1;",
                [technicianID]
            );
            console.log(`Все заявки у мастера ${technicianID}:`, allRequests);

            const { rows } = await this.#dbClient.query(
                "SELECT COALESCE(SUM(complexity), 0) AS total_complexity FROM requests WHERE master_id = $1;",
                [technicianID]
            );

            const currentComplexity = Number(rows[0]?.total_complexity) || 0;
            console.log(`Текущая сложность у мастера ${technicianID}:`, currentComplexity);

            if (currentComplexity + complexity > 100) {
                console.error(
                    `Ошибка добавления заявки: Достигнута максимальная сложность для мастера ${technicianID}. ` +
                    `Текущая: ${currentComplexity}, Новая: ${complexity}, Лимит: 100`
                );
                throw new Error(
                    `Превышен лимит сложности для мастера ${technicianID}. Текущая:${currentComplexity}, Новая: ${complexity}, Лимит: 100`
                );
            }

            await this.#dbClient.query(
                'INSERT INTO requests (id, address, complexity, master_id) VALUES ($1, $2, $3, $4);',
                [requestID, address, complexity, technicianID]
            );

            await this.#dbClient.query('COMMIT');
            console.log(`Заявка ${requestID} успешно добавлена мастеру ${technicianID}`);
        } catch (error) {
            await this.#dbClient.query('ROLLBACK');
            console.error('Ошибка в addRequest:', error);
            return Promise.reject({ type: 'client', message: error.message });
        }
    }

    async moveRequest({ requestID, srcTechnicianID, destTechnicianID }) {
        if (!requestID || !srcTechnicianID || !destTechnicianID) {
            return Promise.reject(new Error("Неверные параметры перемещения заявок"));
        }
    
        try {
            await this.#dbClient.query("BEGIN");
    
            const { rows: reqRows } = await this.#dbClient.query(
                "SELECT complexity FROM requests WHERE id = $1;",
                [requestID]
            );
    
            if (reqRows.length === 0) {
                throw new Error(`Заявка ${requestID} не найдена`);
            }
    
            const complexity = reqRows[0].complexity;
            console.log(`Перемещение заявки ${requestID} (Сложность: ${complexity})`);
    
            await this.#dbClient.query(
                "UPDATE requests SET master_id = $1 WHERE id = $2;",
                [destTechnicianID, requestID]
            );
    
            const { rows: destUpdatedRows } = await this.#dbClient.query(
                "SELECT COALESCE(SUM(complexity), 0) AS total_complexity FROM requests WHERE master_id = $1;",
                [destTechnicianID]
            );
    
            const destTotalComplexity = destUpdatedRows[0]?.total_complexity || 0;
            console.log(`Сложность у нового мастера ${destTechnicianID} после добавления заявки: ${destTotalComplexity}`);
    
            if (destTotalComplexity > 100) {
                console.error(
                    `Ошибка перемещения: Превышен лимит сложности для мастера ${destTechnicianID}. ` +
                    `Новый общий: ${destTotalComplexity}, Предел: 100`
                );
    
                await this.#dbClient.query(
                    "UPDATE requests SET master_id = $1 WHERE id = $2;",
                    [srcTechnicianID, requestID]
                );
    
                throw new Error(
                    `Ошибка перемещения: Превышен лимит сложности для мастера ${destTechnicianID}. Новый общий: ${destTotalComplexity}, Предел: 100`
                );
            }
    
            await this.#dbClient.query("COMMIT");
    
            console.log(`Заявка ${requestID} успешно перемещена к мастеру ${destTechnicianID}`);
            return { message: "Заявка успешно перемещена" };
    
        } catch (error) {
            await this.#dbClient.query("ROLLBACK");
            console.error("Ошибка в moveRequest:", error.message);
            return Promise.reject({ type: "client", message: error.message });
        }
    }
    
    async deleteTechnician({ technicianID }) {
        if (!technicianID) {
            return Promise.reject(new Error('Неверные параметры удаления мастера'));
        }
    
        try {
            await this.#dbClient.query('BEGIN');
    
            await this.#dbClient.query('DELETE FROM requests WHERE master_id = $1;', [technicianID]);
    
            const result = await this.#dbClient.query('DELETE FROM masters WHERE id = $1 RETURNING *;', [technicianID]);
    
            if (result.rowCount === 0) {
                throw new Error(`Мастер ${technicianID} не найден`);
            }
    
            await this.#dbClient.query('COMMIT');
            console.log(`Мастер ${technicianID} удален успешно`);
    
            return { message: `Мастер ${technicianID} удален успешно` };
        } catch (error) {
            await this.#dbClient.query('ROLLBACK');
            console.error('Ошибка удаления мастера:', error);
            return Promise.reject({ type: 'client', message: error.message });
        }
    }    
    
    async updateTechnician({ technicianID, fullName } = { technicianID: null, fullName: '' }) {
        if (!technicianID || !fullName) {
            const errMsg = 'Ошибка обновления мастера: неверные параметры';
            console.error(errMsg);
            return Promise.reject({
                type: 'client',
                error: new Error(errMsg),
            });
        }
        try {
            await this.#dbClient.query(
                'UPDATE masters SET full_name = $1 WHERE id = $2;',
                [fullName, technicianID]
            );
        } catch (error) {
            console.error('Невозможно обновить мастера:', error);
            return Promise.reject({
                type: 'internal',
                error,
            });
        }
    }

    async deleteRequest({ requestID }) {
        if (!requestID) {
            return Promise.reject(new Error('Невозможно удалить параметры заявки'));
        }
        try {
            await this.#dbClient.query('DELETE FROM requests WHERE id = $1;', [requestID]);
        } catch (error) {
            console.error('Невозможно удалить заявку:', error);
            return Promise.reject(error);
        }
    }
}
