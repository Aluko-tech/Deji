import { PrismaClient } from "@prisma/client";
import { t } from "../utils/i18n.js";

const prisma = new PrismaClient();

export const detectLanguage = async (req, res, next) => {
  try {
    let lang = "en";

    // 1️⃣ Prefer explicit "Accept-Language" header
    if (req.headers["accept-language"]) {
      lang = req.headers["accept-language"].split(",")[0].toLowerCase().slice(0, 2);
    }

    // 2️⃣ Fallback to user or tenant preference
    if (req.user) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.id },
        include: { tenant: true },
      });

      lang = user?.language || user?.tenant?.language || lang;
    }

    req.lang = lang;
    req.t = (key, vars = {}) => t(lang, key, vars);
    next();
  } catch (error) {
    console.error("🌍 Language detection error:", error);
    req.lang = "en";
    req.t = (key) => key;
    next();
  }
};
