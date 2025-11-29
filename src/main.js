const { invoke } = window.__TAURI__.core;
const { listen } = window.__TAURI__.event;

const stringToColour = (str) => {
  let hash = 0;
  str.split('').forEach(char => {
    hash = char.charCodeAt(0) + ((hash << 5) - hash)
  })
  let colour = '#'
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xff
    colour += value.toString(16).padStart(2, '0')
  }
  return colour
}

let name = "";
let nick = "";
let channel = "";

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("setup_form").onsubmit = (ev) => {
    ev.preventDefault()
    name = document.getElementById("setup_nick").value
    nick = name;
    invoke("connect_irc", {
      username: name,
      realname: name,
      server: document.getElementById("setup_server").value
    });

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
      if (document.getElementById("message_text").value.startsWith("/join")) {
        channel = document.getElementById("message_text").value.split(" ")[1];
      } else if (document.getElementById("message_text").value.startsWith("/nick")) {
        nick = document.getElementById("message_text").value.split(" ")[1];
      }
      invoke("send_irc_message", { content: document.getElementById("message_text").value, channel: channel });
      document.getElementById("message_text").value = "";
    }
  }
});
