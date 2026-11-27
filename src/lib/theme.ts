// Light / dark appearance. The script runs before the page is painted, so a dark-mode
// visitor never sees a white flash.
export const THEME_KEY = "khairiyat-theme";
export const THEME_SCRIPT = `try{if(localStorage.getItem("${THEME_KEY}")==="dark")document.documentElement.dataset.theme="dark"}catch(e){}`;
