const { PrismaClient } = require("@prisma/client");
const { NODE_ENV } = require("../env");

let prisma;

if (NODE_ENV === "production") {
    prisma = new PrismaClient();
} else {
    if (!global.__silverbulletPrisma) {
        global.__silverbulletPrisma = new PrismaClient();
    }
    prisma = global.__silverbulletPrisma;
}

module.exports = prisma;
