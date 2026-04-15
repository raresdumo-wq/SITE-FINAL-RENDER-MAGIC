const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_REST_KEY = process.env.ONESIGNAL_REST_KEY;

// 1. Ruta obligatorie pentru CRON-JOB (Rezolvă eroarea 404)
app.get('/ping', (req, res) => {
    res.status(200).send("Serverul este activ!");
});

// 2. Ruta pentru Notificări Push (OneSignal)
app.post('/notify', async (req, res) => {
    try {
        const { heading, content } = req.body;
        await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Authorization': `Basic ${ONESIGNAL_REST_KEY}`
            },
            body: JSON.stringify({
                app_id: ONESIGNAL_APP_ID,
                included_segments: ['Subscribed Users'],
                headings: { en: heading, ro: heading },
                contents: { en: content, ro: content },
                url: "https://clasa6c.netlify.app"
            })
        });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. Ruta pentru Sincronizare Date
app.get('/sync', async (req, res) => {
    try {
        const { data, error } = await supabase.from('db_state').select('*').eq('id', 1).single();
        if (error) throw error;
        res.json(data);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/sync', async (req, res) => {
    try {
        const { users, content, lectii, docs, resp, home, proiecte, history } = req.body;
        const { error } = await supabase.from('db_state').update({ users, content, lectii, docs, resp, home, proiecte, history }).eq('id', 1);
        if (error) throw error;
        res.json({ ok: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// 4. Ruta pentru Login
app.post('/login', async (req, res) => {
    try {
        const { password } = req.body;
        if (password === "R8R") return res.json({ role: "Admin" });
        const { data } = await supabase.from('db_state').select('users').eq('id', 1).single();
        const users = typeof data.users === 'string' ? JSON.parse(data.users) : data.users;
        const user = (users || []).find(u => u.pass === password);
        if (user) res.json({ role: user.role }); else res.status(401).send("Acces refuzat");
    } catch (err) { res.status(500).json({ error: err.message }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server activ pe port ${PORT}`));