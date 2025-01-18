import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import DB from './db/client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
    path: './backend/.env',
});

const appHost = process.env.APP_HOST;
const appPort = process.env.APP_PORT;

const app = express();
const db = new DB();

app.use('*', (req, res, next) => {
    console.log(req.method, req.baseUrl || req.url, new Date().toISOString());
    next();
});

app.get('/user', (req, res) => {
    const user = {
        username: process.env.DB_LOGIN,
        avatar: '/images/keanu.jpg'
    };
    res.json(user);
});


app.use('/', express.static(path.resolve(__dirname, '../dist')));

app.get('/technicians', async (req, res) => {
    try {
        const [dbTechnicians, dbRequests] = await Promise.all([db.getTechnicians(), db.getRequests()]);
        const requests = dbRequests.map(({ id, address, complexity }) => ({
            requestID: id,
            address,
            complexity,
        }));
        const technicians = dbTechnicians.map((tech) => ({
            technicianID: tech.id,
            fullName: tech.full_name,
            requests: requests.filter((req) => tech.assigned_requests.indexOf(req.requestID) !== -1),
        }));
        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.json({ technicians });
    } catch (error) {
        res.statusCode = 500;
        res.statusMessage = 'Ошибка внутреннего сервера';
        res.json({
            timestamp: new Date().toISOString(),
            statusCode: 500,
            message: `Ошибка получения мастеров и запросов`,
        });
    }
});

app.use('/technicians', express.json());
app.post('/technicians', async (req, res) => {
    try {
        const { technicianID, fullName } = req.body;
        await db.addTechnician({ technicianID, fullName });
        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.send();
    } catch (err) {
        switch (err.type) {
            case 'client':
                res.statusCode = 400;
                res.statusMessage = 'Плохой запрос';
                break;
            default:
                res.statusCode = 500;
                res.statusMessage = 'Ошибка внутреннего сервера';
        }
        res.json({
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            message: `Ошибка добавления мастеров: ${err.error.message || err.error}`,
        });
    }
});

app.use('/requests', express.json());
app.post('/requests', async (req, res) => {
    console.log("[POST] /requests - Получены данные запроса:", req.body);

    try {
        const { requestID, address, complexity, technicianID } = req.body;
        console.log(`Данные: ID=${requestID}, Address=${address}, Complexity=${complexity}, TechnicianID=${technicianID}`);

        await db.addRequest({ requestID, address, complexity, technicianID });

        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.send();
    } catch (err) {
        res.status(500).json({
            timestamp: new Date().toISOString(),
            statusCode: 500,
            message: `Ошибка добавления запроса: ${err.message}`,
        });        
    }
});

app.use('/technicians/:technicianID', express.json());
app.patch('/technicians/:technicianID', async (req, res) => {
    try {
        const { technicianID } = req.params;
        const { fullName } = req.body;
        await db.updateTechnician({ technicianID, fullName });
        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.send();
    } catch (err) {
        switch (err.type) {
            case 'client':
                res.statusCode = 400;
                res.statusMessage = 'Плохой запрос';
                break;
            default:
                res.statusCode = 500;
                res.statusMessage = 'Ошибка внутреннего сервера';
        }
        res.json({
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            message: `Ошибка обнавления мастера`,
        });
    }
});

app.delete('/technicians/:technicianID', async (req, res) => {
    try {
        const { technicianID } = req.params;
        await db.deleteTechnician({ technicianID });

        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.send();
    } catch (err) {
        switch (err.type) {
            case 'client':
                res.statusCode = 400;
                res.statusMessage = 'Плохой запрос';
                break;
            default:
                res.statusCode = 500;
                res.statusMessage = 'Ошибка внутреннего сервера';
        }
        res.json({
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            message: `Ошибка удаления мастера: ${err.message}`,
        });
    }
});

app.use('/requests/:requestID', express.json());
app.patch('/requests/:requestID', async (req, res) => {
    try {
        const { requestID } = req.params;
        const { address, complexity } = req.body;
        await db.updateRequest({ requestID, address, complexity });
        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.send();
    } catch (err) {
        switch (err.type) {
            case 'client':
                res.statusCode = 400;
                res.statusMessage = 'Плохой запрос';
                break;
            default:
                res.statusCode = 500;
                res.statusMessage = 'Ошибка внутреннего сервера';
        }
        res.json({
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            message: `Ошибка обнавления запроса: ${err.error.message || err.error}`,
        });
    }
});

app.delete('/requests/:requestID', async (req, res) => {
    try {
        const { requestID } = req.params;
        await db.deleteRequest({ requestID });
        res.statusCode = 200;
        res.statusMessage = 'OK';
        res.send();
    } catch (err) {
        switch (err.type) {
            case 'client':
                res.statusCode = 400;
                res.statusMessage = 'Плохой запрос';
                break;
            default:
                res.statusCode = 500;
                res.statusMessage = 'Ошибка внутреннего сервера';
        }
        res.json({
            timestamp: new Date().toISOString(),
            statusCode: res.statusCode,
            message: `Ошибка удаления заявки: ${err.error.message || err.error}`,
        });
    }
});

app.patch("/technicians", async (req, res) => {
    try {
        const { requestID, srcTechnicianID, destTechnicianID } = req.body;
        const result = await db.moveRequest({ requestID, srcTechnicianID, destTechnicianID });

        res.status(200).json(result);
    } catch (err) {
        console.error("Ошибка запроса на перемещение:", err.message || err);

        res.status(err.type === "client" ? 400 : 500).json({
            timestamp: new Date().toISOString(),
            statusCode: err.type === "client" ? 400 : 500,
            message: `Ошибка запроса на перемещение: ${err.message || err}`,
        });
    }
});

const server = app.listen(Number(appPort), appHost, async () => {
    try {
        await db.connect();
    } catch (error) {
        process.exit(100);
    }

    console.log(`App started at host http://${appHost}:${appPort}`);
});

process.on('SIGTERM', () => {
    server.close(async () => {
        await db.disconnect();
    });
});
