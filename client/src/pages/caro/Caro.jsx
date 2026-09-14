import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button, Card, Input, Segmented, Space, Tag, Typography, message } from "antd";
import { CrownOutlined, ReloadOutlined, RobotOutlined, TeamOutlined, ThunderboltOutlined, WifiOutlined } from "@ant-design/icons";
import { getCaroAiMove } from "../../services/caro.service";
import { connectSocket } from "../../services/socket";

const SIZE = 15;
const createBoard = () => Array.from({ length: SIZE }, () => Array(SIZE).fill(""));
const copyBoard = (board) => board.map((line) => [...line]);

const winnerAt = (board, row, col, mark) => [[0, 1], [1, 0], [1, 1], [1, -1]].some(([dr, dc]) => {
  let count = 1;
  for (const direction of [1, -1]) {
    let r = row + dr * direction; let c = col + dc * direction;
    while (r >= 0 && r < SIZE && c >= 0 && c < SIZE && board[r][c] === mark) { count += 1; r += dr * direction; c += dc * direction; }
  }
  return count >= 5;
});

const waitForSocket = () => new Promise((resolve, reject) => {
  const socket = connectSocket();
  if (socket.connected) return resolve(socket);
  const timer = window.setTimeout(() => reject(new Error("Không kết nối được máy chủ realtime")), 7000);
  socket.once("connect", () => { window.clearTimeout(timer); resolve(socket); });
  socket.once("connect_error", () => { window.clearTimeout(timer); reject(new Error("Không kết nối được máy chủ realtime")); });
});

const roomRequest = async (event, payload = {}) => {
  const socket = await waitForSocket();
  return new Promise((resolve, reject) => socket.timeout(7000).emit(event, payload, (error, response) => {
    if (error) return reject(new Error("Máy chủ realtime chưa phản hồi"));
    if (!response?.success) return reject(new Error(response?.message || "Không thể thực hiện thao tác"));
    resolve(response.room);
  }));
};

const Board = ({ board, lastMove, onMove, disabled }) => <div className="caro-board-scroll"><div className="caro-board" role="grid" aria-label="Bàn cờ caro">
  {board.flatMap((line, row) => line.map((cell, col) => {
    const active = lastMove?.row === row && lastMove?.col === col;
    return <button key={`${row}-${col}`} type="button" role="gridcell" disabled={disabled || Boolean(cell)} onClick={() => onMove(row, col)} className={`caro-cell ${cell ? `is-${cell.toLowerCase()}` : ""} ${active ? "is-last" : ""}`}><AnimatePresence mode="wait">{cell && <motion.span initial={{ scale: 0, rotate: -110 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 520, damping: 24 }}>{cell}</motion.span>}</AnimatePresence></button>;
  }))}
</div></div>;

const WinnerOverlay = ({ winner, onRestart, machine }) => {
  if (!winner) return null;
  const title = winner === "draw" ? "Ván cờ hòa!" : winner === "X" ? (machine ? "Bạn thắng rồi!" : "Quân X chiến thắng!") : (machine ? "Máy đã thắng" : "Quân O chiến thắng!");
  return <AnimatePresence><motion.div className="caro-win" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><div className="caro-confetti">{Array.from({ length: 24 }, (_, index) => <i key={index} style={{ "--i": index }} />)}</div><motion.div initial={{ scale: 0.7, y: 18 }} animate={{ scale: 1, y: 0 }} className="caro-win-card"><CrownOutlined /><h2>{title}</h2><p>Ấn chơi lại để bắt đầu ván mới.</p><Button type="primary" size="large" icon={<ReloadOutlined />} onClick={onRestart}>Chơi lại</Button></motion.div></motion.div></AnimatePresence>;
};

const Caro = () => {
  const [mode, setMode] = useState("machine");
  const [difficulty, setDifficulty] = useState("medium");
  const [machineBoard, setMachineBoard] = useState(createBoard);
  const [machineLastMove, setMachineLastMove] = useState(null);
  const [machineWinner, setMachineWinner] = useState(null);
  const [thinking, setThinking] = useState(false);
  const [room, setRoom] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [roomBusy, setRoomBusy] = useState(false);
  const [socketOnline, setSocketOnline] = useState(false);

  useEffect(() => {
    const socket = connectSocket();
    const online = () => setSocketOnline(true); const offline = () => setSocketOnline(false);
    const onState = (nextRoom) => setRoom(nextRoom);
    const onClosed = ({ message: reason }) => { setRoom(null); message.info(reason); };
    setSocketOnline(socket.connected);
    socket.on("connect", online); socket.on("disconnect", offline); socket.on("caro:state", onState); socket.on("caro:closed", onClosed);
    return () => { socket.off("connect", online); socket.off("disconnect", offline); socket.off("caro:state", onState); socket.off("caro:closed", onClosed); };
  }, []);

  const resetMachine = () => { setMachineBoard(createBoard()); setMachineLastMove(null); setMachineWinner(null); setThinking(false); };
  const playMachine = async (row, col) => {
    if (thinking || machineWinner || machineBoard[row][col]) return;
    const next = copyBoard(machineBoard); next[row][col] = "X"; setMachineBoard(next); setMachineLastMove({ row, col });
    if (winnerAt(next, row, col, "X")) return setMachineWinner("X");
    if (next.every((line) => line.every(Boolean))) return setMachineWinner("draw");
    setThinking(true);
    try {
      const response = await getCaroAiMove(next, difficulty);
      const { row: aiRow, col: aiCol } = response.data?.data || {};
      if (!Number.isInteger(aiRow) || next[aiRow]?.[aiCol]) throw new Error("Nước đi của máy không hợp lệ");
      next[aiRow][aiCol] = "O"; setMachineBoard(copyBoard(next)); setMachineLastMove({ row: aiRow, col: aiCol });
      if (winnerAt(next, aiRow, aiCol, "O")) setMachineWinner("O"); else if (next.every((line) => line.every(Boolean))) setMachineWinner("draw");
    } catch (error) { message.error(error?.response?.data?.message || error.message || "Không thể gọi máy chơi cờ"); } finally { setThinking(false); }
  };

  const createRoom = async () => { setRoomBusy(true); try { const nextRoom = await roomRequest("caro:create"); setRoom(nextRoom); setRoomCode(nextRoom.code); message.success("Đã tạo phòng — gửi mã cho đối thủ nhé!"); } catch (error) { message.error(error.message); } finally { setRoomBusy(false); } };
  const joinRoom = async () => { if (!roomCode.trim()) return message.warning("Nhập mã phòng trước nhé"); setRoomBusy(true); try { setRoom(await roomRequest("caro:join", { code: roomCode.trim() })); } catch (error) { message.error(error.message); } finally { setRoomBusy(false); } };
  const restartRoom = () => connectSocket().emit("caro:restart", { code: room?.code });
  const friendWinner = room?.winner;
  const machineStatus = machineWinner ? "Ván cờ đã kết thúc" : thinking ? "Máy đang suy nghĩ nước đi..." : "Đến lượt bạn — quân X";
  const friendStatus = !room ? "Tạo phòng hoặc nhập mã phòng của bạn bè." : !room.players.O ? `Mã ${room.code}: đang chờ đối thủ vào phòng.` : friendWinner ? "Ván cờ đã kết thúc" : room.turn === room.yourMark ? `Đến lượt bạn — quân ${room.yourMark}` : "Đối thủ đang suy nghĩ...";

  return <div className="caro-page mx-auto w-full max-w-5xl pb-8">
    <style>{`.caro-hero{background:radial-gradient(circle at 15% 0,#c7d2fe,transparent 34%),radial-gradient(circle at 90% 15%,#fde68a,transparent 28%),linear-gradient(135deg,#f8fafc,#eff6ff);border:1px solid #dbeafe;border-radius:28px;padding:24px}.caro-board-scroll{width:100%;overflow-x:auto;padding:3px 0 12px;-webkit-overflow-scrolling:touch}.caro-board{display:grid;grid-template-columns:repeat(15,minmax(0,1fr));width:min(100%,680px);overflow:hidden;border:7px solid #78350f;border-radius:18px;background:#f8d89a;box-shadow:0 18px 44px rgba(120,53,15,.2)}.caro-cell{aspect-ratio:1;border:1px solid rgba(120,53,15,.48);background:transparent;color:#172554;font-size:clamp(12px,2.8vw,30px);font-weight:900;line-height:1;transition:background .15s}.caro-cell:not(:disabled):hover{background:rgba(255,255,255,.42)}.caro-cell.is-x{color:#e11d48}.caro-cell.is-o{color:#1d4ed8}.caro-cell.is-last{background:rgba(254,240,138,.85);box-shadow:inset 0 0 0 2px #f59e0b}.caro-win{position:fixed;inset:0;z-index:1100;display:grid;place-items:center;background:rgba(15,23,42,.54);overflow:hidden}.caro-win-card{position:relative;z-index:1;width:min(90vw,390px);padding:34px 28px;border-radius:26px;text-align:center;background:white;box-shadow:0 28px 90px rgba(15,23,42,.34)}.caro-win-card svg{font-size:48px;color:#f59e0b}.caro-win-card h2{margin:10px 0 6px;color:#162036;font-size:26px}.caro-win-card p{margin:0 0 20px;color:#64748b}.caro-confetti i{position:absolute;top:-16px;left:calc((var(--i) + .5) * 4%);width:10px;height:18px;background:hsl(calc(var(--i) * 31),86%,60%);animation:caro-fall calc(1.8s + var(--i) * .04s) linear infinite;transform:rotate(calc(var(--i) * 29deg))}@keyframes caro-fall{to{top:105%;transform:translateX(80px) rotate(720deg)}}@media(max-width:560px){.caro-page{margin-left:-4px;margin-right:-4px}.caro-hero{padding:18px;border-radius:20px}.caro-board{width:510px;border-width:4px;border-radius:12px}.caro-cell{font-size:23px}.caro-win-card{padding:28px 20px}}`}</style>
    <section className="caro-hero mb-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><Typography.Title level={2} className="!mb-1 !text-slate-900">Cờ caro <span className="text-blue-600">Yakiuo</span></Typography.Title><Typography.Text className="!text-slate-600">Xếp 5 quân liên tiếp, chặn nước đi và giành chiến thắng.</Typography.Text></div><Tag color={socketOnline ? "success" : "warning"} icon={<WifiOutlined />}>{socketOnline ? "Realtime đã kết nối" : "Đang kết nối realtime"}</Tag></div></section>
    <Segmented className="mb-5" size="large" value={mode} onChange={setMode} options={[{ value:"machine", label:<Space><RobotOutlined />Đấu máy</Space> }, { value:"friend", label:<Space><TeamOutlined />Đấu bạn</Space> }]} />
    {mode === "machine" ? <Card className="!rounded-3xl"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><div className="mb-2"><Tag color="magenta">Bạn · X</Tag><Tag color="blue">Máy Python · O</Tag></div><b className="text-slate-800">{machineStatus}</b></div><Space wrap><Segmented value={difficulty} onChange={setDifficulty} disabled={thinking || machineBoard.some((line) => line.some(Boolean))} options={[{ value:"easy", label:"Dễ" }, { value:"medium", label:"Vừa" }, { value:"hard", label:"Khó" }]} /><Button icon={<ReloadOutlined />} onClick={resetMachine}>Ván mới</Button></Space></div><Board board={machineBoard} lastMove={machineLastMove} onMove={playMachine} disabled={thinking || Boolean(machineWinner)} /></Card> : <Card className="!rounded-3xl"><div className="mb-5 flex flex-wrap items-center gap-2"><Button type="primary" icon={<ThunderboltOutlined />} loading={roomBusy} onClick={createRoom}>Tạo phòng mới</Button><Input value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} placeholder="Mã phòng" maxLength={5} className="w-36" /><Button loading={roomBusy} onClick={joinRoom}>Vào phòng</Button>{room && <Button icon={<ReloadOutlined />} onClick={restartRoom}>Chơi lại</Button>}</div><div className="mb-4 rounded-2xl bg-slate-50 px-4 py-3 text-slate-700"><b>{friendStatus}</b>{room && <span className="ml-2 text-slate-400">Bạn: {room.yourMark || "khán giả"}</span>}</div>{room ? <Board board={room.board} lastMove={room.lastMove} onMove={(row, col) => connectSocket().emit("caro:move", { code: room.code, row, col })} disabled={!room.players.O || Boolean(friendWinner) || room.turn !== room.yourMark} /> : <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center text-slate-400"><TeamOutlined className="mb-3 text-3xl" /><p className="m-0">Mời đồng đội vào một phòng để bắt đầu.</p></div>}</Card>}
    <WinnerOverlay winner={mode === "machine" ? machineWinner : friendWinner} machine={mode === "machine"} onRestart={mode === "machine" ? resetMachine : restartRoom} />
  </div>;
};

export default Caro;
