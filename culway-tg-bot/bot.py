# bot.py
import asyncio
from aiogram import Bot, Dispatcher, F
from aiogram.filters import CommandStart
from aiogram.types import ReplyKeyboardMarkup, KeyboardButton, WebAppInfo

BOT_TOKEN  = "8246844409:AAHUFGCL0ji5lLBKDiow2iuNEOrxiR13akg"   # ← вставьте строкой
WEBAPP_URL = "https://b6459414-543c-43f7-a896-ff853359be50.tunnel4.com"  # ← ваш HTTPS URL

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()

@dp.message(CommandStart())
async def on_start(m):
    kb = ReplyKeyboardMarkup(
        resize_keyboard=True,
        keyboard=[[KeyboardButton(text="Открыть CulWay", web_app=WebAppInfo(url=WEBAPP_URL))]]
    )
    await m.answer("Запускаем CulWay 🚀", reply_markup=kb)

@dp.message(F.text == "/app")
async def app_btn(m):
    await m.answer(
        "Открыть CulWay",
        reply_markup={
            "inline_keyboard": [[{"text": "Открыть", "web_app": {"url": WEBAPP_URL}}]]
        }
    )

async def main():
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())