import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button, Card, Input, Modal, Popconfirm, Segmented, Space, Table, Tag, Typography, message } from "antd";
import { ClockCircleOutlined, DeleteOutlined, EyeOutlined, ReloadOutlined, RobotOutlined, TeamOutlined, ThunderboltOutlined, ThunderboltOutlined as LightbulbOutlined, WifiOutlined } from "@ant-design/icons";
import { deleteCaroHistory, getCaroAiMove, getCaroHint, getCaroHistory } from "../../services/caro.service";
import { connectSocket } from "../../services/socket";
import { useAuth } from "../../store/AuthContext";
import UserAvatar from "../../components/common/UserAvatar";

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

const Board = ({ board, lastMove, hintMove, onMove, disabled }) => <div className="caro-board-scroll"><div className="caro-board" role="grid" aria-label="Bàn cờ caro">
  {board.flatMap((line, row) => line.map((cell, col) => {
    const active = lastMove?.row === row && lastMove?.col === col;
    const hinted = hintMove?.row === row && hintMove?.col === col;
    return <button key={`${row}-${col}`} type="button" role="gridcell" disabled={disabled || Boolean(cell)} onClick={() => onMove?.(row, col)} className={`caro-cell ${cell ? `is-${cell.toLowerCase()}` : ""} ${active ? "is-last" : ""} ${hinted ? "is-hint" : ""}`}><AnimatePresence mode="wait">{cell && <motion.span initial={{ scale: 0, rotate: -110 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 520, damping: 24 }}>{cell}</motion.span>}</AnimatePresence></button>;
  }))}
</div></div>;

const WinnerOverlay = ({ winner, onRestart, machine, winnerName }) => {
  if (!winner) return null;
  const title = winner === "draw" ? "Ván hòa" : winnerName || (winner === "X" ? (machine ? "Bạn thắng" : "Quân X thắng") : (machine ? "Máy thắng" : "Quân O thắng"));
  return <AnimatePresence><motion.div className="caro-win" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.div initial={{ scale: 0.94, y: 12 }} animate={{ scale: 1, y: 0 }} className="caro-win-card"><span className="caro-result-label">KẾT QUẢ VÁN ĐẤU</span><h2>{title}</h2><p>Bắt đầu ván mới khi hai bên sẵn sàng.</p><Button type="primary" size="large" icon={<ReloadOutlined />} onClick={onRestart}>Ván mới</Button></motion.div></motion.div></AnimatePresence>;
};

const playerName = (player) => player?.fullName || player?.username || "Đang chờ người chơi";
const replayBoardAt = (moves, step) => {
  const board = createBoard();
  moves.slice(0, step).forEach(({ row, col, mark }) => { board[row][col] = mark; });
  return board;
};

const PlayerCard = ({ player, mark, active }) => <div className={`caro-player ${active ? "is-active" : ""}`}>
  <UserAvatar user={player} size={46} openDetail={false} className="caro-player-avatar">{playerName(player).slice(0, 1).toUpperCase()}</UserAvatar>
  <div className="min-w-0"><b className="block truncate">{playerName(player)}</b><span>{player ? `Quân ${mark}` : "Chưa vào phòng"}</span></div>
  <strong className={`caro-mark is-${mark.toLowerCase()}`}>{mark}</strong>
</div>;

const MatchHistory = ({ games, loading, pagination, onChange, canDelete, onDelete, onReplay }) => {
  const player = (item) => <div className="flex min-w-0 items-center gap-2"><UserAvatar user={item} size={34} openDetail={false}>{playerName(item).slice(0, 1)}</UserAvatar><span className="truncate font-semibold">{playerName(item)}</span></div>;
  const columns = [
    { title: "Người chơi X", dataIndex: "playerX", render: player },
    { title: "Người chơi O", dataIndex: "playerO", render: player },
    { title: "Kết quả", key: "result", render: (_, game) => <Tag color={game.winner === "draw" ? "default" : "green"}>{game.winner === "draw" ? "Hòa" : `${playerName(game.winner === "X" ? game.playerX : game.playerO)} thắng`}</Tag> },
    { title: "Nước đi", dataIndex: "moveCount", align: "center", width: 90 },
    { title: "Thời gian", dataIndex: "createdAt", width: 170, render: (time) => new Date(time).toLocaleString("vi-VN") },
  ];
  columns.push({ title: "", key: "actions", width: canDelete ? 100 : 52, render: (_, game) => <Space size={0}><Button type="text" icon={<EyeOutlined />} disabled={!game.moves?.length} onClick={() => onReplay(game)} aria-label="Xem lại ván đấu" />{canDelete && <Popconfirm title="Xóa lịch sử ván này?" description="Thao tác này không thể hoàn tác." okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }} onConfirm={() => onDelete(game._id)}><Button type="text" danger icon={<DeleteOutlined />} aria-label="Xóa lịch sử" /></Popconfirm>}</Space> });
  return <Card className="mt-5 !rounded-3xl caro-history" title="Lịch sử các ván đấu"><p className="-mt-2 mb-4 text-sm text-slate-500">Các ván online đã kết thúc, mới nhất ở trên cùng.</p><Table rowKey="_id" columns={columns} dataSource={games} loading={loading} scroll={{ x: 760 }} locale={{ emptyText: "Chưa có ván đấu nào được ghi nhận." }} pagination={{ current: pagination.page, pageSize: pagination.limit, total: pagination.total, showSizeChanger: false, onChange }} /></Card>;
};

const Caro = () => {
  const { user } = useAuth();
  const [mode, setMode] = useState("machine");
  const [difficulty, setDifficulty] = useState("medium");
  const [machineBoard, setMachineBoard] = useState(createBoard);
  const [machineLastMove, setMachineLastMove] = useState(null);
  const [machineWinner, setMachineWinner] = useState(null);
  const [thinking, setThinking] = useState(false);
  const [localBoard, setLocalBoard] = useState(createBoard);
  const [localLastMove, setLocalLastMove] = useState(null);
  const [localTurn, setLocalTurn] = useState("X");
  const [localWinner, setLocalWinner] = useState(null);
  const [room, setRoom] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [roomBusy, setRoomBusy] = useState(false);
  const [socketOnline, setSocketOnline] = useState(false);
  const [matchHistory, setMatchHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPagination, setHistoryPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [clockNow, setClockNow] = useState(Date.now());
  const [hintMove, setHintMove] = useState(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [hintStatus, setHintStatus] = useState({ winCount: 0, requiredWins: 3, available: false });
  const [replayGame, setReplayGame] = useState(null);
  const [replayStep, setReplayStep] = useState(0);

  const loadHistory = useCallback(async (page = historyPagination.page) => {
    try {
      setHistoryLoading(true);
      const response = await getCaroHistory({ page, limit: historyPagination.limit });
      setMatchHistory(response.data?.data?.games || []);
      setHistoryPagination((previous) => ({ ...previous, ...(response.data?.data?.pagination || {}), page }));
      setHintStatus(response.data?.data?.hint || { winCount: 0, requiredWins: 3, available: false });
    } catch {
      setMatchHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPagination.limit, historyPagination.page]);

  useEffect(() => {
    const socket = connectSocket();
    const online = () => setSocketOnline(true); const offline = () => setSocketOnline(false);
    const onState = (nextRoom) => { setRoom(nextRoom); setHintMove(null); };
    const onClosed = ({ message: reason }) => { setRoom(null); message.info(reason); };
    setSocketOnline(socket.connected);
    socket.on("connect", online); socket.on("disconnect", offline); socket.on("caro:state", onState); socket.on("caro:closed", onClosed);
    return () => { socket.off("connect", online); socket.off("disconnect", offline); socket.off("caro:state", onState); socket.off("caro:closed", onClosed); };
  }, []);

  useEffect(() => { void loadHistory(); }, [loadHistory]);
  useEffect(() => { if (room?.winner) void loadHistory(); }, [room?.winner, loadHistory]);
  useEffect(() => {
    if (mode !== "friend" || !room?.players?.O || room.winner) return undefined;
    setClockNow(Date.now());
    const timer = window.setInterval(() => setClockNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [mode, room?.players?.O, room?.winner, room?.turnStartedAt]);

  const resetMachine = () => { setMachineBoard(createBoard()); setMachineLastMove(null); setMachineWinner(null); setThinking(false); };
  const resetLocal = () => { setLocalBoard(createBoard()); setLocalLastMove(null); setLocalTurn("X"); setLocalWinner(null); };
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

  const playLocal = (row, col) => {
    if (localWinner || localBoard[row][col]) return;
    const next = copyBoard(localBoard);
    next[row][col] = localTurn;
    setLocalBoard(next);
    setLocalLastMove({ row, col });
    if (winnerAt(next, row, col, localTurn)) return setLocalWinner(localTurn);
    if (next.every((line) => line.every(Boolean))) return setLocalWinner("draw");
    setLocalTurn((mark) => mark === "X" ? "O" : "X");
  };

  const createRoom = async () => { setRoomBusy(true); try { const nextRoom = await roomRequest("caro:create"); setRoom(nextRoom); setRoomCode(nextRoom.code); message.success("Đã tạo phòng — gửi mã cho đối thủ nhé!"); } catch (error) { message.error(error.message); } finally { setRoomBusy(false); } };
  const joinRoom = async () => { if (!roomCode.trim()) return message.warning("Nhập mã phòng trước nhé"); setRoomBusy(true); try { setRoom(await roomRequest("caro:join", { code: roomCode.trim() })); } catch (error) { message.error(error.message); } finally { setRoomBusy(false); } };
  const restartRoom = () => connectSocket().emit("caro:restart", { code: room?.code });
  const requestHint = async () => {
    if (!room || room.winner || !room.players.O || room.turn !== room.yourMark) return;
    if (!hintStatus.available) return message.warning(`Cần thắng ${hintStatus.requiredWins} trận online để dùng gợi ý (${hintStatus.winCount}/${hintStatus.requiredWins})`);
    try {
      setHintLoading(true);
      const response = await getCaroHint(room.board, room.yourMark);
      const move = response.data?.data;
      if (!Number.isInteger(move?.row) || !Number.isInteger(move?.col)) throw new Error("Không có gợi ý hợp lệ");
      setHintMove(move);
      message.info(`Gợi ý: hàng ${move.row + 1}, cột ${move.col + 1}`);
    } catch (error) { message.error(error?.response?.data?.message || error.message || "Không thể lấy gợi ý"); } finally { setHintLoading(false); }
  };
  const friendWinner = room?.winner;
  const secondsLeft = room?.turnStartedAt ? Math.max(0, 60 - Math.floor((clockNow - room.turnStartedAt) / 1000)) : 60;
  const machineStatus = machineWinner ? "Ván cờ đã kết thúc" : thinking ? "Máy đang suy nghĩ nước đi..." : "Đến lượt bạn — quân X";
  const localStatus = localWinner ? "Ván cờ đã kết thúc" : `Đến lượt Người chơi ${localTurn === "X" ? "1" : "2"} — quân ${localTurn}`;
  const friendStatus = !room ? "Tạo phòng hoặc nhập mã phòng của bạn bè." : !room.players.O ? `Mã ${room.code}: đang chờ đối thủ vào phòng.` : friendWinner ? "Ván cờ đã kết thúc" : room.turn === room.yourMark ? `Đến lượt bạn — quân ${room.yourMark}` : "Đối thủ đang suy nghĩ...";
  const friendWinnerName = friendWinner && friendWinner !== "draw" ? `${playerName(room?.playerInfo?.[friendWinner])} ${room?.timeoutWinner ? "thắng do đối thủ hết giờ" : "thắng"}` : undefined;
  const handleDeleteHistory = async (id) => { try { await deleteCaroHistory(id); message.success("Đã xóa lịch sử ván đấu"); const page = matchHistory.length === 1 && historyPagination.page > 1 ? historyPagination.page - 1 : historyPagination.page; void loadHistory(page); } catch (error) { message.error(error?.response?.data?.message || "Không thể xóa lịch sử ván đấu"); } };
  const openReplay = (game) => { setReplayGame(game); setReplayStep(game.moves?.length || 0); };
  const replayMoves = replayGame?.moves || [];
  const replayLastMove = replayStep ? replayMoves[replayStep - 1] : null;

  return <div className="caro-page mx-auto w-full max-w-5xl pb-8">
    <style>{`.caro-hero{background:radial-gradient(circle at 15% 0,#c7d2fe,transparent 34%),radial-gradient(circle at 90% 15%,#fde68a,transparent 28%),linear-gradient(135deg,#f8fafc,#eff6ff);border:1px solid #dbeafe;border-radius:28px;padding:24px}.caro-board-scroll{width:100%;overflow-x:auto;padding:3px 0 12px;-webkit-overflow-scrolling:touch}.caro-board{display:grid;grid-template-columns:repeat(15,minmax(0,1fr));width:min(100%,680px);overflow:hidden;border:7px solid #78350f;border-radius:18px;background:#f8d89a;box-shadow:0 18px 44px rgba(120,53,15,.2)}.caro-cell{aspect-ratio:1;border:1px solid rgba(120,53,15,.48);background:transparent;color:#172554;font-size:clamp(12px,2.8vw,30px);font-weight:900;line-height:1;transition:background .15s}.caro-cell:not(:disabled):hover{background:rgba(255,255,255,.42)}.caro-cell.is-x,.caro-mark.is-x{color:#e11d48}.caro-cell.is-o,.caro-mark.is-o{color:#1d4ed8}.caro-cell.is-last{background:rgba(254,240,138,.85);box-shadow:inset 0 0 0 2px #f59e0b}.caro-cell.is-hint{background:rgba(196,181,253,.7);box-shadow:inset 0 0 0 2px #7c3aed}.caro-players{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:12px}.caro-player{display:flex;align-items:center;gap:10px;min-width:0;padding:10px 12px;border:1px solid #e2e8f0;border-radius:18px;background:#fff;color:#334155;transition:.2s}.caro-player.is-active{border-color:#818cf8;background:#eef2ff;box-shadow:0 7px 18px rgba(99,102,241,.15)}.caro-player span{font-size:12px;color:#94a3b8}.caro-player-avatar{flex:none}.caro-mark{margin-left:auto;font-size:24px}.caro-versus{font-weight:900;color:#94a3b8;font-style:italic}.caro-history .ant-card-head{border-bottom:0}.caro-history-row{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px;border-radius:16px;background:#f8fafc}.caro-win{position:fixed;inset:0;z-index:1100;display:grid;place-items:center;background:rgba(15,23,42,.54);overflow:hidden}.caro-win-card{position:relative;z-index:1;width:min(90vw,390px);padding:34px 28px;border-radius:26px;text-align:center;background:white;box-shadow:0 28px 90px rgba(15,23,42,.34)}.caro-win-card h2{margin:10px 0 6px;color:#162036;font-size:26px}.caro-win-card p{margin:0 0 20px;color:#64748b}.caro-result-label{font-size:11px;font-weight:700;letter-spacing:.11em;color:#64748b}@media(max-width:560px){.caro-page{margin-left:-4px;margin-right:-4px}.caro-hero{padding:18px;border-radius:20px}.caro-board{width:510px;border-width:4px;border-radius:12px}.caro-cell{font-size:23px}.caro-players{grid-template-columns:1fr}.caro-versus{text-align:center}.caro-history-row{align-items:flex-start;flex-direction:column}.caro-win-card{padding:28px 20px}}`}</style>
    <section className="caro-hero mb-5"><div className="flex flex-wrap items-center justify-between gap-3"><Typography.Title level={2} className="!m-0 !text-slate-900">Caro</Typography.Title><Tag color={socketOnline ? "success" : "warning"} icon={<WifiOutlined />}>{socketOnline ? "Đã kết nối" : "Đang kết nối"}</Tag></div></section>
    <Segmented className="mb-5" size="large" value={mode} onChange={setMode} options={[{ value:"machine", label:<Space><RobotOutlined />Đấu máy</Space> }, { value:"local", label:<Space><TeamOutlined />Cùng thiết bị</Space> }, { value:"friend", label:<Space><ThunderboltOutlined />Đấu online</Space> }]} />
    {mode === "friend" && <div className="mb-4 text-sm text-slate-500">Gợi ý: <Tag color={hintStatus.available ? "success" : "default"}>{hintStatus.available ? "Đã mở" : `${hintStatus.winCount}/${hintStatus.requiredWins} trận thắng`}</Tag></div>}
    {mode === "machine" ? <Card className="!rounded-3xl"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><div className="mb-2"><Tag color="magenta">Bạn · X</Tag><Tag color="blue">Máy Python · O</Tag></div><b className="text-slate-800">{machineStatus}</b></div><Space wrap><Segmented value={difficulty} onChange={setDifficulty} disabled={thinking || machineBoard.some((line) => line.some(Boolean))} options={[{ value:"easy", label:"Dễ" }, { value:"medium", label:"Vừa" }, { value:"hard", label:"Khó" }]} /><Button icon={<ReloadOutlined />} onClick={resetMachine}>Ván mới</Button></Space></div><Board board={machineBoard} lastMove={machineLastMove} onMove={playMachine} disabled={thinking || Boolean(machineWinner)} /></Card> : mode === "local" ? <Card className="!rounded-3xl"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><div className="mb-2"><Tag color="magenta">Người chơi 1 · X</Tag><Tag color="blue">Người chơi 2 · O</Tag></div><b className="text-slate-800">{localStatus}</b></div><Button icon={<ReloadOutlined />} onClick={resetLocal}>Ván mới</Button></div><Board board={localBoard} lastMove={localLastMove} onMove={playLocal} disabled={Boolean(localWinner)} /></Card> : <><Card className="!rounded-3xl"><div className="mb-5 flex flex-wrap items-center gap-2"><Button type="primary" icon={<ThunderboltOutlined />} loading={roomBusy} onClick={createRoom}>Tạo phòng mới</Button><Input value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} placeholder="Mã phòng" maxLength={5} className="w-36" /><Button loading={roomBusy} onClick={joinRoom}>Vào phòng</Button>{room && <Button icon={<ReloadOutlined />} onClick={restartRoom}>Chơi lại</Button>}<Button icon={<LightbulbOutlined />} loading={hintLoading} disabled={!room?.players.O || Boolean(friendWinner) || room?.turn !== room?.yourMark} onClick={requestHint}>Gợi ý</Button></div>{room && <div className="caro-players mb-4"><PlayerCard player={room.playerInfo?.X} mark="X" active={!friendWinner && room.turn === "X"} /><div className="caro-versus">VS</div><PlayerCard player={room.playerInfo?.O} mark="O" active={!friendWinner && room.turn === "O"} /></div>}<div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-slate-700"><div><b>{friendStatus}</b>{room && <span className="ml-2 text-slate-400">Bạn: {room.yourMark || "khán giả"}</span>}</div>{room?.players.O && !friendWinner && <Tag color={secondsLeft <= 10 ? "error" : "blue"} icon={<ClockCircleOutlined />}>{secondsLeft}s</Tag>}</div>{room ? <Board board={room.board} lastMove={room.lastMove} hintMove={hintMove} onMove={(row, col) => connectSocket().emit("caro:move", { code: room.code, row, col })} disabled={!room.players.O || Boolean(friendWinner) || room.turn !== room.yourMark} /> : <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center text-slate-400"><TeamOutlined className="mb-3 text-3xl" /><p className="m-0">Mời đồng đội vào một phòng để bắt đầu.</p></div>}</Card><MatchHistory games={matchHistory} loading={historyLoading} pagination={historyPagination} onChange={(page) => void loadHistory(page)} canDelete={user?.role === "admin"} onDelete={handleDeleteHistory} onReplay={openReplay} /></>}
    <WinnerOverlay winner={mode === "machine" ? machineWinner : mode === "local" ? localWinner : friendWinner} machine={mode === "machine"} winnerName={mode === "friend" ? friendWinnerName : undefined} onRestart={mode === "machine" ? resetMachine : mode === "local" ? resetLocal : restartRoom} />
    <Modal open={Boolean(replayGame)} title="Xem lại ván đấu" footer={null} onCancel={() => setReplayGame(null)} width={760}>{replayGame && <><div className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><b>{playerName(replayGame.playerX)} vs {playerName(replayGame.playerO)}</b><span className="ml-2 text-slate-400">{replayGame.winner === "draw" ? "Hòa" : `${playerName(replayGame.winner === "X" ? replayGame.playerX : replayGame.playerO)} thắng`}</span></div><Tag>{replayStep}/{replayMoves.length} nước</Tag></div><div className="mb-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">{replayGame.endReason === "timeout" ? "Phân tích: ván đấu kết thúc do một người chơi hết thời gian." : replayGame.winner === "draw" ? "Phân tích: ván đấu kết thúc hòa." : `Phân tích: nước ${replayMoves.length} (${replayLastMove?.mark}) là nước kết thúc ván.`}</div><Board board={replayBoardAt(replayMoves, replayStep)} lastMove={replayLastMove} disabled /><div className="mt-3 flex justify-center gap-2"><Button disabled={!replayStep} onClick={() => setReplayStep((step) => step - 1)}>Trước</Button><Button disabled={replayStep >= replayMoves.length} onClick={() => setReplayStep((step) => step + 1)}>Sau</Button></div></>}</Modal>
  </div>;
};

export default Caro;
