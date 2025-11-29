const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

window.addEventListener("DOMContentLoaded", () => {
  // invoke("connect_irc", { username: "owomay", realname: "owomay", server: "irc.hackclub.com:6667" });

  listen("irc-message", (event) => {
    for (let line of event.payload.trim().split("\r\n")) {
      let message = document.createElement("span");
      message.innerText = line;
      document.getElementById("body").appendChild(message);
    }
    document.getElementById("body").scrollTop = document.getElementById("body").scrollHeight;
  });

  document.getElementById("message").onsubmit = (event) => {
    event.preventDefault()
    invoke("send_irc_message", { content: document.getElementById("message_text").value, channel: "#irc-ysws" });
    document.getElementById("message_text").value = "";
  }
});
