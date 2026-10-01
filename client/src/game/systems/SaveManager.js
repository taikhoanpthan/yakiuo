const SAVE_KEY = "yakiuo-restaurant-simulator-v1";

export const defaultSave = () => ({
  day: 1,
  time: "08:00",
  money: 300000000,
  reputation: 0,
  restaurant: { rented: false, location: null },
  playerPosition: { scene: "StreetScene", x: 170, y: 400 },
});

export const loadSave = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || "{}");
    return { ...defaultSave(), ...saved, restaurant: { ...defaultSave().restaurant, ...saved.restaurant } };
  }
  catch { return defaultSave(); }
};

export const saveGame = (state) => localStorage.setItem(SAVE_KEY, JSON.stringify(state));
export const clearGame = () => localStorage.removeItem(SAVE_KEY);
