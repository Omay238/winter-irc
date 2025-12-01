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

let channel_messages = {}

function updateActiveStates() {
  for (let el of document.querySelectorAll("label")) {
    el.className = document.getElementById(el.htmlFor).checked ? "active" : "";
    if (document.getElementById(el.htmlFor).checked) {
      channel = el.htmlFor;
      addMessage("Viewing: " + el.htmlFor, false);
    }
  }

  for (let line of channel_messages[channel] || []) {
    addMessage(line, false);
  }
}

function addMessage(rawLine, add = true) {
  let line = rawLine;
  let message = document.createElement("span");

  if (line.includes("PRIVMSG")) {
    const prefixEnd = line.indexOf(" ");
    const prefix = line.substring(1, prefixEnd);
    const nickEnd = prefix.indexOf("!");
    const senderNick = prefix.substring(0, nickEnd);

    const msgStart = line.indexOf(":", prefixEnd) + 1;
    const msgContent = line.substring(msgStart);

    const chan = line.substring(
        line.indexOf("PRIVMSG") + 8,
        line.indexOf(" :", prefixEnd)
    ).trim();

    if (add) {
      channel_messages[chan] = channel_messages[chan] || [];
      channel_messages[chan].push(rawLine);
    }

    message.style.color = stringToColour(senderNick);
    line = `<${senderNick}> ${msgContent}`;
  }

  if (channel === "" || rawLine.includes(channel) || !rawLine.includes("#")) {
    message.innerText = line;
    document.getElementById("body").appendChild(message);
  }

  const body = document.getElementById("body");
  body.scrollTop = body.scrollHeight;
}

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("channels").onchange = updateActiveStates;
  document.getElementById("setup_form").onsubmit = (ev) => {
    ev.preventDefault();
    document.getElementById("setup").style.display = "none";
    document.getElementById("message_text").disabled = false;
    name = document.getElementById("setup_nick").value;
    nick = name;
    invoke("connect_irc", {
      username: name,
      realname: name,
      server: document.getElementById("setup_server").value
    });

    listen("irc-message", (event) => {
      for (let line of event.payload.trim().split("\r\n")) {
        addMessage(line);
      }
    });

    document.getElementById("message").onsubmit = (event) => {
      event.preventDefault();

      let line = document.getElementById("message_text").value;

      if (document.querySelector("input[name=channel]:checked") === null) {
        channel = "";
      } else {
        channel = document.querySelector("input[name=channel]:checked").value;
      }

      invoke("send_irc_message", {
        content: line,
        channel: channel
      });

      if (line.startsWith("/join")) {
        channel = line.split(" ")[1];
        let radio = document.createElement("input");
        radio.type = "radio";
        radio.name = "channel";
        radio.value = line.split(" ")[1];
        radio.id = line.split(" ")[1];
        radio.checked = true;
        let label = document.createElement("label");
        label.htmlFor = line.split(" ")[1];
        label.innerText = line.split(" ")[1];
        document.getElementById("channels").appendChild(radio);
        document.getElementById("channels").appendChild(label);
        updateActiveStates();
      } else if (line.startsWith("/part")) {
        if (line.split(" ").length === 1) {
          document.querySelector("label[for=\"" + document.querySelector("input[name=channel]:checked").id + "\"]").remove();
          document.querySelector("input[name=channel]:checked").remove();
        } else {
          document.querySelector("label[for=\"" + line.split(" ")[1] + "\"]").remove();
          document.querySelector("input[name=channel]:checked").remove();
        }
        channel = "";
        updateActiveStates();
      } else if (line.startsWith("/nick")) {
        nick = line.split(" ")[1];
      } else if (line.startsWith("/quit")) {
        invoke("quit");
      }

      if (!line.startsWith("/")) {
        addMessage(":" + nick + "!" + name + "@x PRIVMSG " + channel + " :" + line);
      }

      document.getElementById("message_text").value = "";
    }
  }
});
