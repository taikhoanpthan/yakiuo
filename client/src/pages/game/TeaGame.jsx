import { useEffect, useState } from "react";
import { QuestionCircleOutlined, ReloadOutlined, ThunderboltOutlined } from "@ant-design/icons";
import { useAuth } from "../../store/AuthContext";
import { getTeaGameLeaderboard, submitTeaGameResult } from "../../services/teaGame.service";
import "./TeaGame.css";
import "./TeaGameWorld.css";
import "./TeaGamePlay.css";
import "./TeaGameOrder.css";
import "./TeaGameSprites.css";
import "./TeaGameMotion.css";
import "./TeaGamePixel.css";

const DRINKS = [
  { value: "milk-tea", label: "Trà sữa", emoji: "🧋", price: 32 },
  { value: "green-tea", label: "Trà xanh", emoji: "🍵", price: 26 },
  { value: "matcha", label: "Matcha latte", emoji: "🍵", price: 36 },
];
const TOPPINGS = [
  { value: "none", label: "Không topping", emoji: "—" },
  { value: "boba", label: "Trân châu đen", emoji: "🟤" },
  { value: "cheese", label: "Kem cheese", emoji: "☁️" },
];
const LEVELS = [0, 50, 100];
const TOTAL_ORDERS = 15;
const ORDERS_PER_DAY = 5;
const STOCK_KEYS = ["tea", "milk", "greenTea", "matcha", "cups", "boba", "cheese", "sugar", "ice"];
const EMPTY_STOCK = Object.fromEntries(STOCK_KEYS.map((key) => [key, 0]));
const DELIVERY = { tea: 8, milk: 12, greenTea: 7, matcha: 7, cups: 12, boba: 7, cheese: 7, sugar: 14, ice: 14 };
const INGREDIENT_COST = { tea: 2, milk: 3, greenTea: 2, matcha: 4, cups: 1, boba: 3, cheese: 4, sugar: 1, ice: 1 };
const STOCK_ITEMS = {
  tea: { emoji: "🍃", label: "Trà đen" }, milk: { emoji: "🥛", label: "Sữa tươi" },
  greenTea: { emoji: "🌿", label: "Trà xanh" }, matcha: { emoji: "🍵", label: "Matcha" },
  cups: { emoji: "🥤", label: "Ly nhựa" }, boba: { emoji: "🟤", label: "Trân châu" },
  cheese: { emoji: "☁️", label: "Kem cheese" }, sugar: { emoji: "🍬", label: "Đường" }, ice: { emoji: "🧊", label: "Đá viên" },
};
const SHOP_UPGRADES = [
  { id: "counter", icon: "🧋", title: "Quầy pha chế", description: "+2k lợi nhuận mỗi ly", price: 90 },
  { id: "barista", icon: "👩‍🍳", title: "Thuê barista", description: "+5 giây cho mỗi đơn", price: 120 },
  { id: "marketing", icon: "📣", title: "Góc check-in", description: "+1k tiền tip mỗi combo", price: 150 },
];

const randomItem = (items) => items[Math.floor(Math.random() * items.length)];
const newOrder = () => ({
  id: `${Date.now()}-${Math.random()}`,
  drink: randomItem(DRINKS).value,
  size: randomItem(["M", "L"]),
  topping: randomItem(TOPPINGS).value,
  sugar: randomItem(LEVELS),
  ice: randomItem(LEVELS),
});

const ChoiceButton = ({ active, children, onClick }) => (
  <button type="button" className={`brew-choice ${active ? "is-active" : ""}`} onClick={onClick}>{children}</button>
);

const rankMedal = (rank) => ({ 1: "🥇", 2: "🥈", 3: "🥉" }[rank] || `#${rank}`);
const initials = (name) => name?.trim()?.split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase() || "?";

const TeaGame = () => {
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [selection, setSelection] = useState({ drink: "milk-tea", size: "M", topping: "none", sugar: 50, ice: 50 });
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const [served, setServed] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [notice, setNotice] = useState("Sẵn sàng mở quầy chưa?");
  const [showHowToPlay, setShowHowToPlay] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myEntry, setMyEntry] = useState(null);
  const [rankingLoading, setRankingLoading] = useState(true);
  const [savingResult, setSavingResult] = useState(false);
  const [day, setDay] = useState(1);
  const [stock, setStock] = useState(EMPTY_STOCK);
  const [showStock, setShowStock] = useState(true);
  const [customerState, setCustomerState] = useState("closed");
  const [waiterState, setWaiterState] = useState("idle");
  const [activeSeat, setActiveSeat] = useState(0);
  const [deliveryDraft, setDeliveryDraft] = useState(DELIVERY);
  const [dayRevenue, setDayRevenue] = useState(0);
  const [showDaySummary, setShowDaySummary] = useState(false);
  const [cash, setCash] = useState(180);
  const [upgrades, setUpgrades] = useState([]);
  const [showUpgrades, setShowUpgrades] = useState(false);

  const deliveryCost = STOCK_KEYS.reduce((total, key) => total + (Math.max(0, Number(deliveryDraft[key]) || 0) * INGREDIENT_COST[key]), 0);
  const hasUpgrade = (id) => upgrades.includes(id);
  const orderLimit = 30 + (hasUpgrade("barista") ? 5 : 0);

  const loadLeaderboard = async () => {
    setRankingLoading(true);
    try {
      const response = await getTeaGameLeaderboard();
      setLeaderboard(response.data?.data?.leaderboard || []);
      setMyEntry(response.data?.data?.myEntry || null);
    } catch {
      setLeaderboard([]);
    } finally {
      setRankingLoading(false);
    }
  };

  const startGame = () => {
    setShowStock(true);
    setCustomerState("closed");
    setWaiterState("idle");
    setActiveSeat(0);
    setOrder(null);
    setSelection({ drink: "milk-tea", size: "M", topping: "none", sugar: 50, ice: 50 });
    setPlaying(false);
    setFinished(false);
    setServed(0);
    setMistakes(0);
    setScore(0);
    setCombo(0);
    setBestCombo(0);
    setDay(1);
    setStock(EMPTY_STOCK);
    setDeliveryDraft(DELIVERY);
    setDayRevenue(0);
    setShowDaySummary(false);
    setCash(180);
    setUpgrades([]);
    setShowUpgrades(false);
    setTimeLeft(30);
    setNotice("Nhập kho để bắt đầu Ngày 1.");
  };

  const nextCustomer = (servedCount = served) => {
    const seat = servedCount % 2;
    setActiveSeat(seat);
    setWaiterState("idle");
    setCustomerState("arriving");
    setNotice("Có khách đang đi vào quán…");
    window.setTimeout(() => {
      setOrder(newOrder()); setPlaying(false); setTimeLeft(orderLimit); setCustomerState("ordering");
      setNotice("Khách đang gọi món ở quầy. Bill đã hiện bên cạnh khách.");
    }, 1100);
    window.setTimeout(() => {
      setCustomerState("to-table");
      setNotice("Khách đang đi tới bàn trống…");
    }, 2200);
    window.setTimeout(() => {
      setCustomerState("seated-awaiting"); setPlaying(true); setTimeLeft(orderLimit);
      setNotice("Khách đã ngồi bàn. Pha xong rồi bấm Giao ly nhé!");
    }, 3250);
  };

  const openShop = () => {
    if (deliveryCost > cash) {
      setNotice(`Bạn cần ${deliveryCost - cash}k nữa để nhập đủ hàng. Giảm số lượng hoặc phục vụ thêm ở ca trước nhé.`);
      return;
    }
    setStock((current) => Object.fromEntries(STOCK_KEYS.map((key) => [key, current[key] + Math.max(0, Number(deliveryDraft[key]) || 0)])));
    setCash((current) => current - deliveryCost);
    setShowStock(false); setFinished(false); nextCustomer();
  };

  const updateDeliveryQuantity = (key, value) => {
    const quantity = Math.min(30, Math.max(0, Number(value) || 0));
    setDeliveryDraft((current) => ({ ...current, [key]: quantity }));
  };

  const saveFinishedGame = async (result) => {
    setSavingResult(true);
    try {
      const response = await submitTeaGameResult(result);
      const badge = response.data?.data?.badge;
      if (badge) setNotice(`Bạn nhận huy hiệu “${badge}”! Đang cập nhật bảng xếp hạng.`);
      await loadLeaderboard();
    } catch {
      setNotice("Ca đã kết thúc, nhưng chưa thể lưu điểm. Bạn có thể chơi lại nhé.");
    } finally {
      setSavingResult(false);
    }
  };

  const finishOrder = (correct, timedOut = false) => {
    const nextServed = served + 1;
    const nextMistakes = mistakes + (correct ? 0 : 1);
    const nextCombo = correct ? combo + 1 : 0;
    const nextBestCombo = Math.max(bestCombo, nextCombo);
    const drink = DRINKS.find((item) => item.value === order?.drink);
    const earned = correct ? (drink?.price || 0) + nextCombo * 4 : 0;
    const shopIncome = correct ? earned + (hasUpgrade("counter") ? 2 : 0) + (hasUpgrade("marketing") ? nextCombo : 0) : 0;

    setServed(nextServed);
    setMistakes(nextMistakes);
    setCombo(nextCombo);
    setBestCombo(nextBestCombo);
    setScore((current) => current + earned);
    if (correct) setCash((current) => current + shopIncome);
    if (correct) setDayRevenue((current) => current + earned);

    if (nextServed >= TOTAL_ORDERS || nextMistakes >= 3) {
      setPlaying(false);
      setFinished(true);
      setOrder(null);
      setNotice(nextMistakes >= 3 ? "Quầy tạm đóng vì có quá nhiều đơn sai." : "Hết ca! Bạn đã hoàn thành một ngày ở quầy pha chế.");
      void saveFinishedGame({ score: score + earned, served: nextServed, mistakes: nextMistakes, bestCombo: nextBestCombo });
      return;
    }

    setCustomerState(correct ? "served" : "leaving");
    if (correct) setWaiterState("serving");
    if (nextServed % ORDERS_PER_DAY === 0) {
      window.setTimeout(() => { setWaiterState("returning"); }, correct ? 900 : 250);
      window.setTimeout(() => { setPlaying(false); setOrder(null); setShowDaySummary(true); setNotice(`Hết Ngày ${day}. Xem tổng kết rồi nhập hàng mới nhé!`); }, correct ? 1750 : 800);
      return;
    }
    if (correct) {
      window.setTimeout(() => { setWaiterState("returning"); setCustomerState("leaving-from-table"); }, 900);
      window.setTimeout(() => nextCustomer(nextServed), 1750);
    } else {
      window.setTimeout(() => nextCustomer(nextServed), 800);
    }
    setNotice(correct ? `Chuẩn rồi! +${shopIncome}k tiền quán · Combo ${nextCombo}` : timedOut ? "Khách đã chờ quá lâu! Đơn tiếp theo nhé." : "Chưa đúng đơn rồi, kiểm tra kỹ hơn nhé.");
  };

  const buyUpgrade = (upgrade) => {
    if (hasUpgrade(upgrade.id)) return;
    if (cash < upgrade.price) {
      setNotice(`Chưa đủ vốn để đầu tư ${upgrade.title}. Cần thêm ${upgrade.price - cash}k.`);
      return;
    }
    setCash((current) => current - upgrade.price);
    setUpgrades((current) => [...current, upgrade.id]);
    setNotice(`Đã đầu tư ${upgrade.title}! ${upgrade.description}.`);
  };

  const serveOrder = () => {
    if (!order || !playing) return;
    const correct = ["drink", "size", "topping", "sugar", "ice"].every((key) => selection[key] === order[key]);
    if (correct) {
      const drinkIngredients = { "milk-tea": ["tea", "milk", "cups", "sugar", "ice"], "green-tea": ["greenTea", "cups", "sugar", "ice"], matcha: ["matcha", "milk", "cups", "sugar", "ice"] }[order.drink];
      const required = [...drinkIngredients, ...(order.topping === "none" ? [] : [order.topping])];
      const missing = required.find((key) => stock[key] < 1);
      if (missing) { setNotice(`Kho đã hết ${missing}. Hãy nhập đủ nguyên liệu vào đầu ngày!`); return; }
      setStock((current) => { const next = { ...current }; required.forEach((key) => { next[key] -= 1; }); return next; });
    }
    finishOrder(correct);
  };

  useEffect(() => {
    if (!playing || !order || timeLeft <= 0) return undefined;
    const timer = window.setInterval(() => setTimeLeft((current) => current - 1), 1000);
    return () => window.clearInterval(timer);
  }, [playing, order, timeLeft]);

  useEffect(() => {
    if (playing && order && timeLeft === 0) finishOrder(false, true);
  }, [timeLeft]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { void loadLeaderboard(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const currentDrink = DRINKS.find((item) => item.value === selection.drink);
  const requestedDrink = DRINKS.find((item) => item.value === order?.drink);
  const requestedTopping = TOPPINGS.find((item) => item.value === order?.topping);

  return (
    <div className="brew-game-page">
      <header className="brew-game-hero">
        <div><span className="brew-eyebrow">TIỆM TRÀ SỮA · MÔ PHỎNG QUẢN LÝ</span><h1>Tiệm Trà Sữa Hạnh Phúc</h1><p>Nhập hàng, phục vụ khách và tái đầu tư để quán phát triển.</p></div>
        <div className="brew-hero-actions">
          <button type="button" className="brew-howto-button" onClick={() => setShowUpgrades(true)}>🏪 Quản lý quán · {cash}k</button>
          <button type="button" className="brew-howto-button" onClick={() => setShowHowToPlay(true)}><QuestionCircleOutlined /> Hướng dẫn</button>
          <button type="button" className="brew-restart" onClick={startGame}><ReloadOutlined /> Chơi lại</button>
        </div>
      </header>

      {showHowToPlay && <div className="brew-howto-backdrop" role="presentation" onMouseDown={() => setShowHowToPlay(false)}>
        <section className="brew-howto-modal" role="dialog" aria-modal="true" aria-labelledby="brew-howto-title" onMouseDown={(event) => event.stopPropagation()}>
          <span className="brew-eyebrow">BẮT ĐẦU TRONG 30 GIÂY</span>
          <h2 id="brew-howto-title">Cách chơi Quầy Pha Chế</h2>
          <p className="brew-howto-intro">Đây là tiệm trà sữa của bạn: nhập hàng bằng vốn, pha đúng đơn để có doanh thu, rồi đầu tư nâng cấp quán.</p>
          <ol className="brew-howto-steps">
            <li><b>Nhận đơn:</b> xem món, size, topping, lượng đường và đá ở khung đơn hàng.</li>
            <li><b>Pha ly:</b> chọn đúng toàn bộ nguyên liệu trong khu vực bên dưới.</li>
            <li><b>Giao ly:</b> nhấn “Giao ly cho khách” để chấm đơn. Đơn đúng sẽ tăng doanh thu và combo.</li>
            <li><b>Mở rộng:</b> dùng tiền quán ở mục “Quản lý quán” để nâng quầy, thuê barista hoặc làm góc check-in.</li>
          </ol>
          <div className="brew-howto-rules"><span>⏱ Mỗi đơn có 30 giây</span><span>⚠️ Sai 3 đơn sẽ kết thúc ca</span><span>🔥 Combo càng cao, điểm càng nhiều</span></div>
          <div className="brew-howto-actions"><button type="button" className="brew-howto-close" onClick={() => setShowHowToPlay(false)}>Để sau</button><button type="button" className="brew-howto-start" onClick={() => { setShowHowToPlay(false); startGame(); }}><ThunderboltOutlined /> Bắt đầu chơi</button></div>
        </section>
      </div>}

      {showUpgrades && <div className="brew-howto-backdrop" role="presentation" onMouseDown={() => setShowUpgrades(false)}>
        <section className="brew-upgrade-modal" role="dialog" aria-modal="true" aria-labelledby="brew-upgrade-title" onMouseDown={(event) => event.stopPropagation()}>
          <span className="brew-eyebrow">SỔ QUẢN LÝ TIỆM</span>
          <div className="brew-upgrade-heading"><div><h2 id="brew-upgrade-title">Đầu tư cho quán</h2><p>Mỗi nâng cấp chỉ mua một lần và có hiệu lực ngay trong ca hiện tại.</p></div><b>💰 {cash}k</b></div>
          <div className="brew-upgrade-list">{SHOP_UPGRADES.map((upgrade) => {
            const purchased = hasUpgrade(upgrade.id);
            return <article key={upgrade.id} className={`brew-upgrade-card ${purchased ? "is-purchased" : ""}`}><span>{upgrade.icon}</span><div><b>{upgrade.title}</b><small>{upgrade.description}</small></div><button type="button" disabled={purchased || cash < upgrade.price} onClick={() => buyUpgrade(upgrade)}>{purchased ? "Đã có" : `${upgrade.price}k`}</button></article>;
          })}</div>
          <button type="button" className="brew-howto-close" onClick={() => setShowUpgrades(false)}>Đóng sổ quản lý</button>
        </section>
      </div>}

      {showDaySummary && <div className="brew-howto-backdrop"><section className="brew-stock-modal brew-day-summary"><span className="brew-eyebrow">TỔNG KẾT NGÀY {day}</span><h2>Đóng quầy rồi! 🌙</h2><div><span>Tiền bán hôm nay <b>+{dayRevenue}k</b></span><span>Tổng doanh thu <b>{score}k</b></span><span>Đơn đã phục vụ <b>{served}/{TOTAL_ORDERS}</b></span></div><button type="button" className="brew-howto-start" onClick={() => { setShowDaySummary(false); setDay((value) => value + 1); setDayRevenue(0); setDeliveryDraft(DELIVERY); setShowStock(true); }}>Sang ngày mới & nhập hàng</button></section></div>}
      {showStock && !finished && <div className="brew-howto-backdrop brew-stock-backdrop"><section className="brew-stock-modal" role="dialog" aria-modal="true"><div className="brew-delivery-heading"><div><span className="brew-eyebrow">XE GIAO HÀNG · NGÀY {day}</span><h2>Nhập hàng cho quán</h2><p>Chọn lượng cần mua. Hàng tồn từ hôm qua sẽ được giữ lại.</p></div><span className="brew-delivery-truck">🚚</span></div><div className="brew-delivery-list">{STOCK_KEYS.map((key) => <article className="brew-delivery-item" key={key}><div className="brew-delivery-item-copy"><span>{STOCK_ITEMS[key].emoji}</span><div><b>{STOCK_ITEMS[key].label}</b><small>Kho còn {stock[key]} · {INGREDIENT_COST[key]}k/đơn vị</small></div></div><div className="brew-quantity"><button type="button" aria-label={`Giảm ${STOCK_ITEMS[key].label}`} onClick={() => updateDeliveryQuantity(key, Number(deliveryDraft[key]) - 1)}>−</button><input aria-label={`Số lượng ${STOCK_ITEMS[key].label}`} type="number" min="0" max="30" value={deliveryDraft[key]} onChange={(event) => updateDeliveryQuantity(key, event.target.value)} /><button type="button" aria-label={`Tăng ${STOCK_ITEMS[key].label}`} onClick={() => updateDeliveryQuantity(key, Number(deliveryDraft[key]) + 1)}>+</button></div></article>)}</div><div className="brew-delivery-total"><span>Vốn hiện có <b>{cash}k</b></span><span>Tiền nhập hàng <b>{deliveryCost}k</b></span></div><button type="button" className="brew-howto-start brew-delivery-submit" onClick={openShop}><ThunderboltOutlined /> Thanh toán {deliveryCost}k <span>→</span></button></section></div>}

      <main className="brew-game-board">
        <section className="brew-shop-scene">
          <span className="brew-day-chip">☀️ Ngày {day}/3 · Khách {served % ORDERS_PER_DAY + 1}/5</span>
          <div className="pixel-sprite pixel-counter" />
          <div className="pixel-sprite pixel-prep" />
          <div className="pixel-sprite pixel-table" />
          <div className="pixel-sprite pixel-table pixel-table-two" />
          {customerState !== "closed" && <div className={`pixel-customer ${customerState} seat-${activeSeat}`} aria-label="Khách trong quán" />}
          <div className={`pixel-waiter ${waiterState} seat-${activeSeat}`} aria-label="Nhân viên phục vụ" />
          <div className={`pixel-order-bubble ${customerState === "ordering" ? "is-visible" : ""}`} aria-label={`Khách gọi ${requestedDrink?.label || "đồ uống"}`}><span>{requestedDrink?.emoji || "🧋"}</span></div>
          <div className={`pixel-order-bill ${customerState === "ordering" ? "is-visible" : ""}`}><b>BILL #{Math.min(served + 1, TOTAL_ORDERS).toString().padStart(2, "0")}</b><span>{requestedDrink?.label || "Đồ uống"} · {order?.size || "M"}</span><small>{requestedTopping?.label || "Không topping"}</small></div>
          <div className="brew-scene-brewer">
            <select value={selection.drink} onChange={(event) => setSelection((current) => ({ ...current, drink: event.target.value }))}>{DRINKS.map((drink) => <option value={drink.value} key={drink.value}>{drink.emoji} {drink.label}</option>)}</select>
            <select value={selection.size} onChange={(event) => setSelection((current) => ({ ...current, size: event.target.value }))}><option value="M">Size M</option><option value="L">Size L</option></select>
            <select value={selection.topping} onChange={(event) => setSelection((current) => ({ ...current, topping: event.target.value }))}>{TOPPINGS.map((item) => <option value={item.value} key={item.value}>{item.label}</option>)}</select>
            <select value={selection.sugar} onChange={(event) => setSelection((current) => ({ ...current, sugar: Number(event.target.value) }))}>{LEVELS.map((item) => <option value={item} key={item}>Đường {item}%</option>)}</select>
            <select value={selection.ice} onChange={(event) => setSelection((current) => ({ ...current, ice: Number(event.target.value) }))}>{LEVELS.map((item) => <option value={item} key={item}>Đá {item}%</option>)}</select>
            <button type="button" disabled={!playing} onClick={serveOrder}>Giao đơn · {timeLeft}s</button>
          </div>
        </section>
        <section className="brew-order-panel">
          <div className="brew-order-top"><span>ĐƠN HÀNG #{Math.min(served + 1, TOTAL_ORDERS).toString().padStart(2, "0")}</span>{playing && <b className={timeLeft <= 8 ? "is-urgent" : ""}>⏱ {timeLeft}s</b>}</div>
          {order ? <><div className="brew-order-drink"><span>{requestedDrink?.emoji}</span><div><strong>{requestedDrink?.label}</strong><small>Size {order.size} · {requestedTopping?.label}</small></div></div><div className="brew-order-pills"><span>Đường {order.sugar}%</span><span>Đá {order.ice}%</span></div></> : <div className="brew-empty-order"><span>✨</span><b>{finished ? "Kết thúc ca" : "Mở quầy để nhận đơn"}</b><p>{notice}</p><button type="button" onClick={startGame}><ThunderboltOutlined /> Bắt đầu ca làm</button></div>}
        </section>

        <section className="brew-station" aria-label="Quầy pha chế">
          <div className="brew-cup"><div className="brew-cup-lid" /><div className="brew-cup-body"><span>{currentDrink?.emoji}</span><b>{selection.size}</b><small>{TOPPINGS.find((item) => item.value === selection.topping)?.emoji}</small></div></div>
          <div className="brew-station-copy"><b>Ly đang pha</b><span>{currentDrink?.label} · {selection.size}</span></div>
          <div className="brew-notice" role="status">{notice}</div>
        </section>

        <section className="brew-score-panel"><div><span>TIỀN QUÁN</span><b>{cash}k</b></div><div><span>DOANH THU</span><b>{score}k</b></div><div><span>COMBO</span><b>{combo} 🔥</b></div><div><span>TIẾN ĐỘ</span><b>{served}/{TOTAL_ORDERS}</b></div></section>

        <section className="brew-inventory"><b>📦 Tồn kho</b>{STOCK_KEYS.map((key) => <span className={stock[key] < 2 ? "is-low" : ""} key={key}>{key}: <strong>{stock[key]}</strong></span>)}</section>

        <section className="brew-leaderboard" aria-label="Bảng xếp hạng tuần">
          <div className="brew-leaderboard-head"><div><span>THI ĐUA NỘI BỘ</span><h2>🏆 Bảng xếp hạng tuần</h2><p>Điểm cao nhất của mỗi nhân viên trong tuần này.</p></div><button type="button" onClick={() => void loadLeaderboard()} disabled={rankingLoading}>{rankingLoading ? "Đang tải…" : "Làm mới"}</button></div>
          {myEntry && <div className="brew-my-rank">Bạn đang ở <b>hạng {myEntry.rank}</b> · {myEntry.bestScore}k {myEntry.badge && <span>· {myEntry.badge}</span>}</div>}
          <div className="brew-ranking-list">{rankingLoading ? <p>Đang tải bảng xếp hạng…</p> : leaderboard.length ? leaderboard.map((entry) => <div className={`brew-ranking-row ${String(entry.userId) === String(user?._id) ? "is-me" : ""}`} key={entry.userId}><span className="brew-rank">{rankMedal(entry.rank)}</span>{entry.avatar ? <img src={entry.avatar} alt="" /> : <span className="brew-rank-avatar">{initials(entry.fullName)}</span>}<div className="brew-rank-name"><b>{entry.fullName}</b><small>{entry.badge || "Đang khởi động"}{entry.runs > 1 ? ` · ${entry.runs} lượt` : ""}</small></div><strong>{entry.bestScore}k</strong></div>) : <p>Chưa có ai hoàn thành ca trong tuần này. Hãy là người đầu tiên!</p>}</div>
          {savingResult && <div className="brew-rank-saving">Đang lưu thành tích của bạn…</div>}
        </section>

        <section className={`brew-controls ${!playing ? "is-disabled" : ""}`} aria-label="Chọn nguyên liệu">
          <div className="brew-control-group"><h2>Chọn món</h2><div className="brew-options">{DRINKS.map((drink) => <ChoiceButton key={drink.value} active={selection.drink === drink.value} onClick={() => setSelection((current) => ({ ...current, drink: drink.value }))}>{drink.emoji} {drink.label}</ChoiceButton>)}</div></div>
          <div className="brew-control-group"><h2>Size ly</h2><div className="brew-options">{["M", "L"].map((size) => <ChoiceButton key={size} active={selection.size === size} onClick={() => setSelection((current) => ({ ...current, size }))}>Size {size}</ChoiceButton>)}</div></div>
          <div className="brew-control-group"><h2>Topping</h2><div className="brew-options">{TOPPINGS.map((topping) => <ChoiceButton key={topping.value} active={selection.topping === topping.value} onClick={() => setSelection((current) => ({ ...current, topping: topping.value }))}>{topping.emoji} {topping.label}</ChoiceButton>)}</div></div>
          <div className="brew-control-group"><h2>Đường</h2><div className="brew-options">{LEVELS.map((level) => <ChoiceButton key={level} active={selection.sugar === level} onClick={() => setSelection((current) => ({ ...current, sugar: level }))}>{level}%</ChoiceButton>)}</div></div>
          <div className="brew-control-group"><h2>Đá</h2><div className="brew-options">{LEVELS.map((level) => <ChoiceButton key={level} active={selection.ice === level} onClick={() => setSelection((current) => ({ ...current, ice: level }))}>{level}%</ChoiceButton>)}</div></div>
        </section>

        <button type="button" className="brew-serve" disabled={!playing} onClick={serveOrder}>Giao ly cho khách <span>→</span></button>
      </main>
    </div>
  );
};

export default TeaGame;
