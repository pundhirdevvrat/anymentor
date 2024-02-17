import logging
from telegram import Update
from telegram.ext import Updater, CommandHandler, MessageHandler, Filters, CallbackContext
from transformers import pipeline

# Enable logging
logging.basicConfig(format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                    level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize the Hugging Face pipeline
model_pipeline = pipeline('text-generation', model='gpt2')

# Define command handlers. These usually take the two arguments update and context.
def start(update: Update, context: CallbackContext) -> None:
    update.message.reply_text('Hi! I am your chatbot. Send me a message, and I will respond!')

def chat(update: Update, context: CallbackContext) -> None:
    user_message = update.message.text
    model_response = model_pipeline(user_message, max_length=50)
    update.message.reply_text(model_response[0]['generated_text'])

def error(update: Update, context: CallbackContext) -> None:
    """Log Errors caused by Updates."""
    logger.warning('Update "%s" caused error "%s"', update, context.error)

def main():
    # Create the Updater and pass it your bot's token.
    updater = Updater("YOUR_TELEGRAM_BOT_TOKEN", use_context=True)

    # Get the dispatcher to register handlers
    dp = updater.dispatcher

    # On different commands - answer in Telegram
    dp.add_handler(CommandHandler("start", start))

    # On noncommand i.e message - echo the message on Telegram
    dp.add_handler(MessageHandler(Filters.text & ~Filters.command, chat))

    # Log all errors
    dp.add_error_handler(error)

    # Start the Bot
    updater.start_polling()
    updater.idle()

if __name__ == '__main__':
    main()
