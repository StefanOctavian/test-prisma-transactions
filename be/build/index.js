import { PrismaClient } from '@prisma/client';
import express from 'express';
const prisma = new PrismaClient();
const app = express();
// make the db have 500 users
async function seeder() {
    const promises = [...Array(500).keys()].map(i => prisma.user.upsert({
        where: {
            name: `user${i}`
        },
        create: {
            name: `user${i}`
        },
        update: {},
    }));
    promises.push(prisma.counter.upsert({
        where: {
            id: 1
        },
        create: {
            id: 1,
            counter: 0
        },
        update: {},
    }));
    await Promise.all(promises);
}
await seeder();
app.post('users/:name/count', async (req, res) => {
    const name = req.params.name;
    const user = await prisma.user.findFirst({ where: { name } });
    if (!user)
        throw new Error('User not found');
    prisma.$transaction(async (tx) => {
        // check if user already counted
        const userCount = await tx.counter.findFirst({
            where: {
                users: { some: { name } }
            }
        });
        if (userCount)
            throw new Error('User already counted');
        // increment count
        await tx.counter.update({
            where: { id: 1 },
            data: {
                counter: { increment: 1 },
                users: {
                    connect: { id: user.id }
                }
            }
        });
    }).catch((err) => {
        res.status(400).json({ error: err.message });
    }).then(() => {
        res.status(200).json({ message: 'Counted' });
    });
});
app.get('users/:name/counted', async (req, res) => {
    const name = req.params.name;
    return (await prisma.user.findFirst({
        where: {
            name: name,
            counts: { some: { id: 1 } }
        }
    })) ? res.status(200).json({ message: true }) : res.status(200).json({ message: false });
});
app.get('count/num', async (req, res) => {
    const counter = (await prisma.counter.findFirst({ where: { id: 1 } })).counter;
    res.status(200).json({ message: counter });
});
app.delete('app/reset', async (req, res) => {
    await prisma.counter.update({
        where: { id: 1 },
        data: {
            counter: 0,
            users: { set: [] }
        }
    });
    res.status(200).json({ message: 'Reset' });
});
app.listen(5000, () => {
    console.log('Server running on port 5000');
});
