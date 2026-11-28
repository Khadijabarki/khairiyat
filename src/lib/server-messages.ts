// Urdu versions of the messages the server sends back to the family pages.
import "server-only";
import { getLang } from "./i18n-server";

export const SERVER_MESSAGES_UR: Record<string, string> = {
  "The demo account can't be changed.": "ڈیمو اکاؤنٹ بدلا نہیں جا سکتا۔",
  "Please write your name.": "اپنا نام لکھیں۔",
  "Your name is saved.": "آپ کا نام محفوظ ہو گیا۔",
  "Photos can't be changed in the shared demo.": "مشترکہ ڈیمو میں تصویر نہیں بدلی جا سکتی۔",
  "Please choose a smaller picture.": "چھوٹی تصویر چنیں۔",
  "Please choose a picture file.": "تصویر کی فائل چنیں۔",
  "Too many attempts. Please wait a few minutes.": "بہت زیادہ کوششیں۔ چند منٹ انتظار کریں۔",
  "Please enter a valid email address.": "درست ای میل لکھیں۔",
  "Password must be 8 to 72 characters.": "پاس ورڈ 8 سے 72 حروف کا ہو۔",
  "Could not create the account. Try another email or sign in.": "اکاؤنٹ نہیں بن سکا۔ دوسری ای میل آزمائیں یا سائن اِن کریں۔",
  "Account created. Please confirm your email, then sign in.": "اکاؤنٹ بن گیا۔ ای میل کی تصدیق کر کے سائن اِن کریں۔",
  "Please enter your email and password.": "ای میل اور پاس ورڈ لکھیں۔",
  "Email or password is not correct.": "ای میل یا پاس ورڈ درست نہیں۔",
  "The demo is not set up on this server.": "اس سرور پر ڈیمو تیار نہیں۔",
  "The demo is not available right now.": "ڈیمو ابھی دستیاب نہیں۔",
  "Please fill in the parent's name, what you call them, and your name.": "والدین کا نام، انہیں کیا کہتے ہیں، اور اپنا نام لکھیں۔",
  "Please choose a daily call time.": "روز کال کا وقت چنیں۔",
  "Please check the phone number.": "فون نمبر دوبارہ دیکھیں۔",
  "Please confirm that your parent agrees to talk with Khairiyat (an AI).": "تصدیق کریں کہ والدین خیریت (AI) سے بات کرنے پر راضی ہیں۔",
  "The database is not available.": "ڈیٹابیس دستیاب نہیں۔",
  "A family can add up to 10 parents.": "ایک خاندان زیادہ سے زیادہ 10 والدین شامل کر سکتا ہے۔",
  "Could not save. Please try again.": "محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔",
  "The 2-minute choice can't be saved yet. Run supabase/schema.sql in Supabase first, or choose 5 minutes.":
    "2 منٹ والا انتخاب ابھی محفوظ نہیں ہو سکتا۔ پہلے Supabase میں supabase/schema.sql چلائیں، یا 5 منٹ چنیں۔",
  "Not found.": "نہیں ملا۔",
  "The demo parents can't be changed. Create your own account to add your parents.": "ڈیمو والدین بدلے نہیں جا سکتے۔ اپنا اکاؤنٹ بنائیں۔",
  "Please wait a minute before calling again.": "دوبارہ کال سے پہلے ایک منٹ انتظار کریں۔",
  "Could not place the call. Please try again.": "کال نہیں ہو سکی۔ دوبارہ کوشش کریں۔",
  "Voice messages are switched off in the shared demo.": "مشترکہ ڈیمو میں آواز کے پیغام بند ہیں۔",
  "Please wait a few minutes before sending another message.": "اگلا پیغام بھیجنے سے پہلے چند منٹ انتظار کریں۔",
  "The recording is empty or too long. Please record again.": "ریکارڈنگ خالی یا بہت لمبی ہے۔ دوبارہ ریکارڈ کریں۔",
  "This browser's recording format isn't supported.": "اس براؤزر کی ریکارڈنگ قابلِ قبول نہیں۔",
};

// The message in the family's chosen language (English if there is no translation).
export async function say(message: string): Promise<string> {
  return (await getLang()) === "ur" ? (SERVER_MESSAGES_UR[message] ?? message) : message;
}
