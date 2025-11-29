use libirk::*;
use std::sync::Arc;
use tokio::sync::Mutex;
use tauri::Emitter;

pub struct IRCState {
    pub client: Arc<Mutex<Option<IRCClient>>>,
    pub stop: Arc<Mutex<bool>>,
}

#[tauri::command]
async fn connect_irc(
    state: tauri::State<'_, IRCState>,
    username: String,
    realname: String,
    server: String,
    window: tauri::Window,
) -> Result<(), String> {
    let client = IRCClient::new(server).await.map_err(|e| e.to_string())?;

    *state.client.lock().await = Some(client);

    let client_clone = state.client.clone();
    let window_clone = window.clone();

    tokio::spawn(async move {
        let mut client_lock = client_clone.lock().await;
        let client = client_lock.as_mut().unwrap();
        client.listen(Box::new(move |msg: String| {
            let _ = window_clone.emit("irc-message", msg.clone());
            print!("{}", msg);
        })).await;
    });
    let mut lock = state.client.lock().await;
    let client = lock.as_mut().unwrap();
    client.connect(username, realname).await;

    Ok(())
}

#[tauri::command]
async fn send_irc_message(
    state: tauri::State<'_, IRCState>,
    content: String,
    channel: Option<String>
) -> Result<(), String> {
    let mut client = state.client.lock().await;

    if let Some(cli) = client.as_mut() {
        cli.send_user_message(content, channel.clone())
            .await;
        Ok(())
    } else {
        Err("IRC not connected".into())
    }
}

#[tauri::command]
async fn stop_irc(state: tauri::State<'_, IRCState>) -> Result<(), String> {
    *state.stop.lock().await = true;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(IRCState {
            client: Arc::new(Mutex::new(None)),
            stop: Arc::new(Mutex::new(false)),
        })
        .invoke_handler(tauri::generate_handler![
            connect_irc,
            send_irc_message,
            stop_irc
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
