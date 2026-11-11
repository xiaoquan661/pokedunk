import {
  profanityFn,
  challengeStorage,
  storageRead,
  escapeHtml,
  teamNameClean,
  shuffleArr,
  DRILL_TABLE,
  drillScore,
  drillSpawn,
} from "./store-bridge.js?v=3";
const BASE_ROSTER = [
    [1, "Bulbasaur", ["Grass", "Poison"], "SG", 52, 63, 58, 59, 61, 48, 49, 56],
    [2, "Ivysaur", ["Grass", "Poison"], "SG", 60, 69, 65, 65, 67, 58, 58, 63],
    [4, "Charmander", ["Fire"], "PG", 63, 63, 58, 57, 63, 43, 47, 60],
    [5, "Charmeleon", ["Fire"], "SG", 71, 70, 66, 64, 69, 55, 57, 67],
    [10, "Caterpie", ["Bug"], "PG", 52, 49, 50, 43, 56, 34, 46, 48],
    [12, "Butterfree", ["Bug", "Flying"], "SG", 66, 73, 59, 67, 64, 54, 55, 67],
    [13, "Weedle", ["Bug", "Poison"], "PG", 55, 49, 51, 44, 57, 32, 44, 50],
    [15, "Beedrill", ["Bug", "Poison"], "SG", 69, 59, 76, 62, 67, 51, 60, 64],
    [16, "Pidgey", ["Normal", "Flying"], "PG", 58, 54, 55, 49, 60, 38, 46, 54],
    [18, "Pidgeot", ["Normal", "Flying"], "SF", 83, 68, 75, 65, 77, 66, 69, 72],
    [19, "Rattata", ["Normal"], "PG", 67, 52, 58, 49, 63, 35, 44, 57],
    [20, "Raticate", ["Normal"], "PG", 81, 62, 71, 62, 73, 53, 58, 69],
    [21, "Spearow", ["Normal", "Flying"], "PG", 66, 54, 60, 49, 62, 34, 47, 57],
    [22, "Fearow", ["Normal", "Flying"], "SF", 83, 65, 76, 62, 75, 58, 63, 70],
    [23, "Ekans", ["Poison"], "PF", 57, 56, 64, 54, 62, 54, 47, 56],
    [27, "Sandshrew", ["Ground"], "SF", 49, 48, 68, 45, 69, 55, 58, 48],
    [28, "Sandslash", ["Ground"], "PF", 63, 58, 81, 56, 80, 72, 72, 59],
    [29, "Nidoran♀", ["Poison"], "SG", 50, 55, 57, 50, 60, 44, 53, 51],
    [30, "Nidorina", ["Poison"], "SF", 58, 61, 65, 56, 67, 55, 61, 58],
    [32, "Nidoran♂", ["Poison"], "SG", 55, 56, 60, 51, 60, 40, 50, 53],
    [33, "Nidorino", ["Poison"], "SG", 63, 61, 68, 57, 67, 52, 58, 60],
    [35, "Clefairy", ["Fairy"], "SG", 46, 61, 58, 57, 59, 49, 57, 53],
    [36, "Clefable", ["Fairy"], "PF", 60, 74, 72, 69, 69, 67, 72, 65],
    [37, "Vulpix", ["Fire"], "PG", 63, 60, 54, 59, 61, 44, 45, 60],
    [39, "Jigglypuff", ["Normal", "Fairy"], "SF", 38, 55, 62, 45, 51, 36, 69, 44],
    [40, "Wigglytuff", ["Normal", "Fairy"], "SF", 52, 70, 75, 58, 62, 53, 83, 57],
    [41, "Zubat", ["Poison", "Flying"], "SG", 57, 53, 56, 50, 59, 40, 46, 54],
    [42, "Golbat", ["Poison", "Flying"], "SF", 77, 66, 75, 65, 74, 65, 67, 69],
    [43, "Oddish", ["Grass", "Poison"], "SF", 43, 66, 58, 59, 60, 49, 50, 53],
    [44, "Gloom", ["Grass", "Poison"], "SG", 49, 70, 66, 63, 65, 58, 58, 58],
    [46, "Paras", ["Bug", "Grass"], "SF", 41, 56, 64, 52, 61, 45, 49, 48],
    [47, "Parasect", ["Bug", "Grass"], "PF", 43, 61, 77, 60, 68, 64, 63, 53],
    [48, "Venonat", ["Bug", "Poison"], "SF", 52, 55, 62, 53, 61, 50, 56, 53],
    [49, "Venomoth", ["Bug", "Poison"], "SG", 77, 74, 68, 68, 71, 61, 61, 72],
    [50, "Diglett", ["Ground"], "PG", 80, 57, 56, 55, 64, 31, 36, 65],
    [51, "Dugtrio", ["Ground"], "PG", 94, 63, 76, 64, 76, 48, 53, 76],
    [52, "Meowth", ["Normal"], "PG", 77, 58, 55, 54, 64, 37, 46, 64],
    [53, "Persian", ["Normal"], "PG", 91, 68, 68, 65, 75, 55, 60, 75],
    [56, "Mankey", ["Fighting"], "PG", 66, 55, 68, 53, 64, 39, 50, 59],
    [57, "Primeape", ["Fighting"], "SG", 80, 65, 81, 63, 75, 56, 64, 70],
    [58, "Growlithe", ["Fire"], "SG", 60, 66, 67, 57, 64, 45, 55, 60],
    [60, "Poliwag", ["Water"], "PG", 77, 58, 58, 54, 66, 41, 47, 64],
    [61, "Poliwhirl", ["Water"], "SG", 77, 61, 66, 57, 72, 55, 60, 66],
    [63, "Abra", ["Psychic"], "PG", 77, 79, 46, 66, 58, 35, 36, 71],
    [64, "Kadabra", ["Psychic"], "SG", 85, 85, 54, 72, 65, 46, 46, 78],
    [66, "Machop", ["Fighting"], "PF", 46, 53, 72, 48, 62, 47, 62, 48],
    [67, "Machoke", ["Fighting"], "PF", 52, 59, 82, 56, 69, 63, 71, 55],
    [69, "Bellsprout", ["Grass", "Poison"], "SG", 49, 65, 68, 51, 59, 39, 52, 52],
    [70, "Weepinbell", ["Grass", "Poison"], "SG", 57, 71, 76, 58, 66, 49, 61, 59],
    [72, "Tentacool", ["Water", "Poison"], "PG", 66, 60, 55, 67, 61, 49, 47, 65],
    [73, "Tentacruel", ["Water", "Poison"], "SF", 83, 72, 71, 77, 74, 70, 67, 77],
    [74, "Geodude", ["Rock", "Ground"], "SF", 38, 51, 68, 45, 69, 58, 57, 43],
    [75, "Graveler", ["Rock", "Ground"], "PF", 46, 56, 77, 51, 76, 71, 68, 50],
    [77, "Ponyta", ["Fire"], "SG", 77, 66, 73, 63, 71, 53, 56, 68],
    [81, "Magnemite", ["Electric", "Steel"], "SG", 52, 73, 50, 60, 63, 50, 44, 58],
    [82, "Magneton", ["Electric", "Steel"], "SG", 66, 83, 63, 69, 74, 67, 59, 68],
    [83, "Farfetch’d", ["Normal", "Flying"], "SG", 60, 62, 74, 58, 67, 51, 57, 60],
    [84, "Doduo", ["Normal", "Flying"], "SF", 69, 55, 72, 51, 67, 47, 51, 59],
    [85, "Dodrio", ["Normal", "Flying"], "SF", 88, 66, 85, 63, 79, 64, 66, 73],
    [86, "Seel", ["Water"], "SF", 52, 57, 59, 57, 61, 55, 59, 55],
    [88, "Grimer", ["Poison"], "PF", 41, 54, 73, 51, 60, 50, 65, 47],
    [90, "Shellder", ["Water"], "SG", 49, 57, 61, 47, 71, 56, 52, 50],
    [92, "Gastly", ["Ghost", "Poison"], "SG", 71, 77, 53, 60, 61, 41, 41, 66],
    [93, "Haunter", ["Ghost", "Poison"], "SG", 80, 83, 61, 67, 67, 52, 49, 73],
    [95, "Onix", ["Rock", "Ground"], "C", 66, 53, 59, 52, 85, 99, 65, 58],
    [96, "Drowzee", ["Psychic"], "SG", 50, 56, 60, 61, 59, 53, 55, 56],
    [98, "Krabby", ["Water"], "SF", 55, 51, 77, 45, 74, 53, 55, 51],
    [99, "Kingler", ["Water"], "PF", 69, 60, 91, 56, 85, 74, 70, 62],
    [100, "Voltorb", ["Electric"], "PG", 83, 63, 50, 60, 67, 45, 46, 69],
    [101, "Electrode", ["Electric"], "PG", 99, 74, 61, 73, 80, 62, 59, 87],
    [102, "Exeggcute", ["Grass", "Psychic"], "SG", 49, 62, 55, 53, 65, 55, 57, 53],
    [103, "Exeggutor", ["Grass", "Psychic"], "C", 57, 84, 83, 70, 73, 75, 78, 65],
    [104, "Cubone", ["Ground"], "SF", 46, 55, 58, 51, 68, 60, 56, 50],
    [108, "Lickitung", ["Normal"], "C", 43, 61, 66, 59, 64, 65, 70, 53],
    [109, "Koffing", ["Poison"], "SG", 46, 61, 63, 53, 69, 60, 54, 51],
    [111, "Rhyhorn", ["Ground", "Rock"], "PF", 41, 51, 75, 45, 69, 64, 73, 45],
    [113, "Chansey", ["Normal"], "PF", 55, 54, 62, 64, 49, 55, 99, 59],
    [114, "Tangela", ["Grass"], "SF", 60, 76, 63, 59, 76, 71, 65, 61],
    [116, "Horsea", ["Water"], "SG", 60, 66, 52, 52, 66, 47, 46, 57],
    [117, "Seadra", ["Water"], "SF", 74, 76, 66, 62, 77, 65, 60, 68],
    [118, "Goldeen", ["Water"], "PG", 62, 55, 64, 53, 67, 49, 53, 57],
    [119, "Seaking", ["Water"], "PF", 65, 65, 79, 64, 71, 62, 68, 64],
    [120, "Staryu", ["Water"], "PG", 74, 67, 55, 61, 67, 49, 46, 67],
    [125, "Electabuzz", ["Electric"], "PG", 85, 77, 73, 72, 74, 58, 61, 77],
    [132, "Ditto", ["Normal"], "SG", 53, 58, 57, 53, 61, 43, 50, 54],
    [137, "Porygon", ["Normal"], "SG", 49, 70, 64, 63, 65, 59, 60, 58],
    [138, "Omanyte", ["Rock", "Water"], "SG", 46, 71, 53, 59, 68, 61, 51, 55],
    [140, "Kabuto", ["Rock", "Water"], "SG", 57, 61, 68, 54, 73, 57, 53, 56],
    [147, "Dratini", ["Dragon"], "SF", 55, 59, 66, 54, 62, 53, 49, 55],
    [148, "Dragonair", ["Dragon"], "PF", 66, 67, 76, 63, 70, 72, 61, 64],
    [152, "Chikorita", ["Grass"], "SG", 52, 58, 58, 57, 64, 55, 51, 55],
    [153, "Bayleef", ["Grass"], "SF", 60, 64, 65, 63, 70, 65, 59, 62],
    [155, "Cyndaquil", ["Fire"], "PG", 63, 63, 58, 57, 63, 42, 47, 60],
    [156, "Quilava", ["Fire"], "SG", 71, 70, 65, 64, 69, 54, 57, 67],
    [158, "Totodile", ["Water"], "SG", 51, 56, 64, 52, 65, 50, 55, 52],
    [159, "Croconaw", ["Water"], "SF", 59, 62, 72, 59, 71, 63, 63, 59],
    [161, "Sentret", ["Normal"], "SF", 38, 52, 56, 48, 54, 40, 44, 45],
    [163, "Hoothoot", ["Normal", "Flying"], "SG", 55, 54, 52, 53, 56, 41, 51, 54],
    [164, "Noctowl", ["Normal", "Flying"], "SF", 66, 72, 66, 70, 65, 63, 69, 68],
    [165, "Ledyba", ["Bug", "Flying"], "PG", 57, 56, 47, 60, 56, 46, 43, 58],
    [166, "Ledian", ["Bug", "Flying"], "PG", 74, 63, 55, 71, 66, 60, 52, 70],
    [167, "Spinarak", ["Bug", "Poison"], "SF", 43, 54, 61, 49, 58, 40, 48, 48],
    [168, "Ariados", ["Bug", "Poison"], "PF", 49, 62, 77, 59, 67, 61, 65, 55],
    [170, "Chinchou", ["Water", "Electric"], "PG", 64, 62, 56, 58, 61, 44, 57, 61],
    [171, "Lanturn", ["Water", "Electric"], "PF", 64, 68, 70, 64, 66, 62, 78, 64],
    [172, "Pichu", ["Electric"], "PG", 60, 55, 51, 50, 56, 28, 36, 55],
    [173, "Cleffa", ["Fairy"], "SF", 35, 55, 48, 51, 50, 37, 46, 46],
    [174, "Igglybuff", ["Normal", "Fairy"], "SF", 35, 54, 54, 43, 48, 31, 58, 42],
    [175, "Togepi", ["Fairy"], "SF", 38, 54, 45, 53, 58, 50, 45, 47],
    [176, "Togetic", ["Fairy", "Flying"], "PG", 49, 68, 55, 69, 66, 66, 56, 60],
    [177, "Natu", ["Psychic", "Flying"], "PG", 66, 67, 56, 57, 64, 40, 47, 62],
    [178, "Xatu", ["Psychic", "Flying"], "SG", 80, 76, 71, 68, 74, 63, 61, 73],
    [179, "Mareep", ["Electric"], "SG", 46, 63, 55, 54, 57, 42, 51, 52],
    [180, "Flaaffy", ["Electric"], "SG", 52, 68, 63, 60, 62, 52, 59, 57],
    [182, "Bellossom", ["Grass"], "SG", 55, 72, 71, 70, 73, 68, 68, 63],
    [183, "Marill", ["Water", "Fairy"], "PG", 49, 48, 49, 49, 58, 46, 55, 50],
    [184, "Azumarill", ["Water", "Fairy"], "PF", 55, 62, 64, 62, 67, 65, 72, 59],
    [186, "Politoed", ["Water"], "SG", 66, 73, 73, 72, 71, 68, 71, 68],
    [187, "Hoppip", ["Grass", "Flying"], "PG", 55, 54, 51, 53, 58, 41, 43, 54],
    [188, "Skiploom", ["Grass", "Flying"], "PG", 71, 59, 57, 59, 66, 48, 52, 64],
    [189, "Jumpluff", ["Grass", "Flying"], "PG", 88, 64, 63, 70, 75, 62, 62, 76],
    [190, "Aipom", ["Normal"], "PG", 74, 58, 67, 57, 69, 50, 56, 64],
    [191, "Sunkern", ["Grass"], "SF", 43, 51, 48, 45, 53, 33, 40, 46],
    [192, "Sunflora", ["Grass"], "SF", 43, 76, 71, 67, 62, 56, 63, 58],
    [193, "Yanma", ["Bug", "Flying"], "SG", 80, 70, 67, 60, 69, 49, 58, 69],
    [194, "Wooper", ["Water", "Ground"], "SF", 35, 49, 57, 42, 55, 40, 52, 41],
    [195, "Quagsire", ["Water", "Ground"], "C", 46, 63, 78, 58, 69, 69, 76, 54],
    [198, "Murkrow", ["Dark", "Flying"], "SG", 78, 73, 72, 60, 69, 42, 57, 68],
    [199, "Slowking", ["Water", "Psychic"], "C", 43, 74, 76, 72, 67, 78, 74, 60],
    [200, "Misdreavus", ["Ghost"], "PG", 74, 72, 63, 69, 70, 56, 57, 71],
    [201, "Unown", ["Psychic"], "SG", 53, 66, 66, 56, 63, 44, 53, 56],
    [202, "Wobbuffet", ["Psychic"], "C", 45, 52, 67, 52, 59, 64, 97, 50],
    [203, "Girafarig", ["Normal", "Psychic"], "SF", 74, 74, 74, 65, 72, 61, 64, 69],
    [204, "Pineco", ["Bug"], "SF", 35, 52, 64, 46, 65, 58, 57, 43],
    [205, "Forretress", ["Bug", "Steel"], "C", 49, 62, 77, 57, 81, 84, 78, 54],
    [206, "Dunsparce", ["Normal"], "SF", 52, 63, 73, 59, 66, 65, 72, 56],
    [207, "Gligar", ["Ground", "Flying"], "SF", 74, 56, 70, 58, 79, 71, 67, 64],
    [209, "Snubbull", ["Fairy"], "SF", 43, 54, 71, 49, 61, 45, 58, 48],
    [210, "Granbull", ["Fairy"], "PF", 52, 62, 90, 57, 72, 64, 76, 55],
    [211, "Qwilfish", ["Water", "Poison"], "SG", 74, 63, 76, 59, 77, 59, 65, 65],
    [213, "Shuckle", ["Bug", "Rock"], "C", 29, 43, 41, 84, 86, 99, 57, 55],
    [215, "Sneasel", ["Dark", "Ice"], "PG", 91, 58, 77, 63, 76, 54, 59, 73],
    [216, "Teddiursa", ["Normal"], "SG", 49, 58, 71, 53, 63, 47, 58, 52],
    [217, "Ursaring", ["Normal"], "PF", 57, 67, 95, 63, 74, 69, 80, 61],
    [218, "Slugma", ["Fire"], "SF", 38, 64, 54, 52, 54, 41, 47, 48],
    [219, "Magcargo", ["Fire", "Rock"], "SF", 43, 71, 60, 64, 72, 76, 64, 56],
    [220, "Swinub", ["Ice", "Ground"], "SG", 55, 52, 58, 47, 60, 38, 50, 51],
    [221, "Piloswine", ["Ice", "Ground"], "PF", 55, 62, 83, 57, 72, 65, 78, 57],
    [222, "Corsola", ["Water", "Rock"], "SG", 46, 63, 62, 64, 68, 68, 62, 56],
    [223, "Remoraid", ["Water"], "SG", 63, 65, 63, 54, 62, 38, 47, 59],
    [224, "Octillery", ["Water"], "SF", 52, 77, 82, 66, 70, 62, 69, 61],
    [225, "Delibird", ["Ice", "Flying"], "SG", 69, 65, 61, 57, 65, 46, 50, 63],
    [226, "Mantine", ["Water", "Flying"], "C", 66, 70, 62, 79, 68, 78, 71, 71],
    [227, "Skarmory", ["Steel", "Flying"], "PF", 66, 57, 74, 59, 84, 88, 71, 61],
    [228, "Houndour", ["Dark", "Fire"], "PG", 63, 70, 62, 59, 61, 39, 49, 62],
    [231, "Phanpy", ["Ground"], "SF", 49, 55, 66, 50, 63, 50, 67, 51],
    [232, "Donphan", ["Ground"], "PF", 55, 62, 90, 57, 81, 77, 83, 57],
    [233, "Porygon2", ["Normal"], "SG", 60, 77, 73, 72, 73, 68, 71, 67],
    [234, "Stantler", ["Normal"], "SF", 74, 72, 79, 65, 73, 60, 67, 69],
    [235, "Smeargle", ["Normal"], "SF", 69, 50, 49, 51, 60, 45, 50, 59],
    [236, "Tyrogue", ["Fighting"], "SG", 46, 53, 52, 48, 55, 39, 44, 48],
    [237, "Hitmontop", ["Fighting"], "PF", 66, 55, 77, 67, 77, 75, 62, 64],
    [238, "Smoochum", ["Ice", "Psychic"], "PG", 63, 71, 50, 63, 56, 34, 44, 64],
    [239, "Elekid", ["Electric"], "PG", 80, 66, 63, 61, 67, 42, 50, 69],
    [240, "Magby", ["Fire"], "SG", 73, 67, 68, 61, 66, 43, 51, 66],
    [241, "Miltank", ["Normal"], "PF", 83, 58, 75, 61, 82, 75, 78, 69],
    [244, "Entei", ["Fire"], "C", 83, 75, 92, 69, 81, 77, 90, 74],
    [245, "Suicune", ["Water"], "C", 74, 74, 76, 76, 81, 91, 83, 74],
    [246, "Larvitar", ["Rock", "Ground"], "SG", 50, 57, 64, 53, 61, 46, 55, 52],
    [247, "Pupitar", ["Rock", "Ground"], "PF", 55, 64, 75, 60, 68, 61, 69, 58],
    [251, "Celebi", ["Psychic", "Grass"], "PG", 83, 78, 82, 76, 83, 73, 78, 77],
  ],
  EVOLUTIONS_TABLE = {
    1: { level: 2, to: [2] },
    2: { level: 4, to: [3] },
    4: { level: 2, to: [5] },
    5: { level: 4, to: [6] },
    7: { level: 2, to: [8] },
    8: { level: 4, to: [9] },
    10: { level: 2, to: [11] },
    11: { level: 2, to: [12] },
    13: { level: 2, to: [14] },
    14: { level: 2, to: [15] },
    16: { level: 2, to: [17] },
    17: { level: 4, to: [18] },
    19: { level: 3, to: [20] },
    21: { level: 3, to: [22] },
    23: { level: 3, to: [24] },
    25: { level: 4, to: [26] },
    27: { level: 3, to: [28] },
    29: { level: 2, to: [30] },
    30: { level: 4, to: [31] },
    32: { level: 2, to: [33] },
    33: { level: 4, to: [34] },
    35: { level: 4, to: [36] },
    37: { level: 4, to: [38] },
    39: { level: 4, to: [40] },
    41: { level: 3, to: [42] },
    42: { level: 4, to: [169] },
    43: { level: 3, to: [44] },
    44: { level: 4, to: [45, 182] },
    46: { level: 3, to: [47] },
    48: { level: 4, to: [49] },
    50: { level: 3, to: [51] },
    52: { level: 4, to: [53] },
    54: { level: 4, to: [55] },
    56: { level: 4, to: [57] },
    58: { level: 4, to: [59] },
    60: { level: 3, to: [61] },
    61: { level: 4, to: [62, 186] },
    63: { level: 2, to: [64] },
    64: { level: 4, to: [65] },
    66: { level: 4, to: [67] },
    67: { level: 4, to: [68] },
    69: { level: 3, to: [70] },
    70: { level: 4, to: [71] },
    72: { level: 4, to: [73] },
    74: { level: 3, to: [75] },
    75: { level: 4, to: [76] },
    77: { level: 5, to: [78] },
    79: { level: 4, to: [80, 199] },
    81: { level: 4, to: [82] },
    82: { level: 4, to: [462] },
    84: { level: 4, to: [85] },
    86: { level: 4, to: [87] },
    88: { level: 5, to: [89] },
    90: { level: 4, to: [91] },
    92: { level: 3, to: [93] },
    93: { level: 4, to: [94] },
    95: { level: 4, to: [208] },
    96: { level: 3, to: [97] },
    98: { level: 4, to: [99] },
    100: { level: 4, to: [101] },
    102: { level: 4, to: [103] },
    104: { level: 4, to: [105] },
    109: { level: 4, to: [110] },
    111: { level: 5, to: [112] },
    112: { level: 4, to: [464] },
    113: { level: 4, to: [242] },
    114: { level: 4, to: [465] },
    116: { level: 4, to: [117] },
    117: { level: 4, to: [230] },
    118: { level: 4, to: [119] },
    120: { level: 4, to: [121] },
    123: { level: 4, to: [212] },
    125: { level: 4, to: [466] },
    129: { level: 3, to: [130] },
    133: { level: 4, to: [134, 135, 136, 196, 197, 470] },
    137: { level: 4, to: [233] },
    138: { level: 5, to: [139] },
    140: { level: 5, to: [141] },
    147: { level: 4, to: [148] },
    148: { level: 6, to: [149] },
    152: { level: 2, to: [153] },
    153: { level: 4, to: [154] },
    155: { level: 2, to: [156] },
    156: { level: 4, to: [157] },
    158: { level: 2, to: [159] },
    159: { level: 4, to: [160] },
    161: { level: 2, to: [162] },
    163: { level: 3, to: [164] },
    165: { level: 2, to: [166] },
    167: { level: 3, to: [168] },
    170: { level: 3, to: [171] },
    172: { level: 4, to: [25] },
    173: { level: 4, to: [35] },
    174: { level: 4, to: [39] },
    175: { level: 4, to: [176] },
    176: { level: 4, to: [468] },
    177: { level: 3, to: [178] },
    179: { level: 2, to: [180] },
    180: { level: 4, to: [181] },
    183: { level: 2, to: [184] },
    187: { level: 2, to: [188] },
    188: { level: 3, to: [189] },
    191: { level: 4, to: [192] },
    194: { level: 3, to: [195] },
    204: { level: 4, to: [205] },
    209: { level: 3, to: [210] },
    215: { level: 4, to: [461] },
    216: { level: 4, to: [217] },
    218: { level: 5, to: [219] },
    220: { level: 4, to: [221] },
    221: { level: 4, to: [473] },
    223: { level: 3, to: [224] },
    228: { level: 3, to: [229] },
    231: { level: 3, to: [232] },
    236: { level: 3, to: [106, 107, 237] },
    238: { level: 4, to: [124] },
    239: { level: 4, to: [125] },
    240: { level: 4, to: [126] },
    246: { level: 4, to: [247] },
    247: { level: 6, to: [248] },
  },
  HEIGHT_WEIGHT = {
    1: [0.7, 6.9],
    2: [1, 13],
    3: [2, 100],
    4: [0.6, 8.5],
    5: [1.1, 19],
    6: [1.7, 90.5],
    7: [0.5, 9],
    8: [1, 22.5],
    9: [1.6, 85.5],
    10: [0.3, 2.9],
    11: [0.7, 9.9],
    12: [1.1, 32],
    13: [0.3, 3.2],
    14: [0.6, 10],
    15: [1, 29.5],
    16: [0.3, 1.8],
    17: [1.1, 30],
    18: [1.5, 39.5],
    19: [0.3, 3.5],
    20: [0.7, 18.5],
    21: [0.3, 2],
    22: [1.2, 38],
    23: [2, 6.9],
    24: [3.5, 65],
    25: [0.4, 6],
    26: [0.8, 30],
    27: [0.6, 12],
    28: [1, 29.5],
    29: [0.4, 7],
    30: [0.8, 20],
    31: [1.3, 60],
    32: [0.5, 9],
    33: [0.9, 19.5],
    34: [1.4, 62],
    35: [0.6, 7.5],
    36: [1.3, 40],
    37: [0.6, 9.9],
    38: [1.1, 19.9],
    39: [0.5, 5.5],
    40: [1, 12],
    41: [0.8, 7.5],
    42: [1.6, 55],
    43: [0.5, 5.4],
    44: [0.8, 8.6],
    45: [1.2, 18.6],
    46: [0.3, 5.4],
    47: [1, 29.5],
    48: [1, 30],
    49: [1.5, 12.5],
    50: [0.2, 0.8],
    51: [0.7, 33.3],
    52: [0.4, 4.2],
    53: [1, 32],
    54: [0.8, 19.6],
    55: [1.7, 76.6],
    56: [0.5, 28],
    57: [1, 32],
    58: [0.7, 19],
    59: [1.9, 155],
    60: [0.6, 12.4],
    61: [1, 20],
    62: [1.3, 54],
    63: [0.9, 19.5],
    64: [1.3, 56.5],
    65: [1.5, 48],
    66: [0.8, 19.5],
    67: [1.5, 70.5],
    68: [1.6, 130],
    69: [0.7, 4],
    70: [1, 6.4],
    71: [1.7, 15.5],
    72: [0.9, 45.5],
    73: [1.6, 55],
    74: [0.4, 20],
    75: [1, 105],
    76: [1.4, 300],
    77: [1, 30],
    78: [1.7, 95],
    79: [1.2, 36],
    80: [1.6, 78.5],
    81: [0.3, 6],
    82: [1, 60],
    83: [0.8, 15],
    84: [1.4, 39.2],
    85: [1.8, 85.2],
    86: [1.1, 90],
    87: [1.7, 120],
    88: [0.9, 30],
    89: [1.2, 30],
    90: [0.3, 4],
    91: [1.5, 132.5],
    92: [1.3, 0.1],
    93: [1.6, 0.1],
    94: [1.5, 40.5],
    95: [8.8, 210],
    96: [1, 32.4],
    97: [1.6, 75.6],
    98: [0.4, 6.5],
    99: [1.3, 60],
    100: [0.5, 10.4],
    101: [1.2, 66.6],
    102: [0.4, 2.5],
    103: [2, 120],
    104: [0.4, 6.5],
    105: [1, 45],
    106: [1.5, 49.8],
    107: [1.4, 50.2],
    108: [1.2, 65.5],
    109: [0.6, 1],
    110: [1.2, 9.5],
    111: [1, 115],
    112: [1.9, 120],
    113: [1.1, 34.6],
    114: [1, 35],
    115: [2.2, 80],
    116: [0.4, 8],
    117: [1.2, 25],
    118: [0.6, 15],
    119: [1.3, 39],
    120: [0.8, 34.5],
    121: [1.1, 80],
    122: [1.3, 54.5],
    123: [1.5, 56],
    124: [1.4, 40.6],
    125: [1.1, 30],
    126: [1.3, 44.5],
    127: [1.5, 55],
    128: [1.4, 88.4],
    129: [0.9, 10],
    130: [6.5, 235],
    131: [2.5, 220],
    132: [0.3, 4],
    133: [0.3, 6.5],
    134: [1, 29],
    135: [0.8, 24.5],
    136: [0.9, 25],
    137: [0.8, 36.5],
    138: [0.4, 7.5],
    139: [1, 35],
    140: [0.5, 11.5],
    141: [1.3, 40.5],
    142: [1.8, 59],
    143: [2.1, 460],
    144: [1.7, 55.4],
    145: [1.6, 52.6],
    146: [2, 60],
    147: [1.8, 3.3],
    148: [4, 16.5],
    149: [2.2, 210],
    150: [2, 122],
    151: [0.4, 4],
    152: [0.9, 6.4],
    153: [1.2, 15.8],
    154: [1.8, 100.5],
    155: [0.5, 7.9],
    156: [0.9, 19],
    157: [1.7, 79.5],
    158: [0.6, 9.5],
    159: [1.1, 25],
    160: [2.3, 88.8],
    161: [0.8, 6],
    162: [1.8, 32.5],
    163: [0.7, 21.2],
    164: [1.6, 40.8],
    165: [1, 10.8],
    166: [1.4, 35.6],
    167: [0.5, 8.5],
    168: [1.1, 33.5],
    169: [1.8, 75],
    170: [0.5, 12],
    171: [1.2, 22.5],
    172: [0.3, 2],
    173: [0.3, 3],
    174: [0.3, 1],
    175: [0.3, 1.5],
    176: [0.6, 3.2],
    177: [0.2, 2],
    178: [1.5, 15],
    179: [0.6, 7.8],
    180: [0.8, 13.3],
    181: [1.4, 61.5],
    182: [0.4, 5.8],
    183: [0.4, 8.5],
    184: [0.8, 28.5],
    185: [1.2, 38],
    186: [1.1, 33.9],
    187: [0.4, 0.5],
    188: [0.6, 1],
    189: [0.8, 3],
    190: [0.8, 11.5],
    191: [0.3, 1.8],
    192: [0.8, 8.5],
    193: [1.2, 38],
    194: [0.4, 8.5],
    195: [1.4, 75],
    196: [0.9, 26.5],
    197: [1, 27],
    198: [0.5, 2.1],
    199: [2, 79.5],
    200: [0.7, 1],
    201: [0.5, 5],
    202: [1.3, 28.5],
    203: [1.5, 41.5],
    204: [0.6, 7.2],
    205: [1.2, 125.8],
    206: [1.5, 14],
    207: [1.1, 64.8],
    208: [9.2, 400],
    209: [0.6, 7.8],
    210: [1.4, 48.7],
    211: [0.5, 3.9],
    212: [1.8, 118],
    213: [0.6, 20.5],
    214: [1.5, 54],
    215: [0.9, 28],
    216: [0.6, 8.8],
    217: [1.8, 125.8],
    218: [0.7, 35],
    219: [0.8, 55],
    220: [0.4, 6.5],
    221: [1.1, 55.8],
    222: [0.6, 5],
    223: [0.6, 12],
    224: [0.9, 28.5],
    225: [0.9, 16],
    226: [2.1, 220],
    227: [1.7, 50.5],
    228: [0.6, 10.8],
    229: [1.4, 35],
    230: [1.8, 152],
    231: [0.5, 33.5],
    232: [1.1, 120],
    233: [0.6, 32.5],
    234: [1.4, 71.2],
    235: [1.2, 58],
    236: [0.7, 21],
    237: [1.4, 48],
    238: [0.4, 6],
    239: [0.6, 23.5],
    240: [0.7, 21.4],
    241: [1.2, 75.5],
    242: [1.5, 46.8],
    243: [1.9, 178],
    244: [2.1, 198],
    245: [2, 187],
    246: [0.6, 72],
    247: [1.2, 152],
    248: [2, 202],
    249: [5.2, 216],
    250: [3.8, 199],
    251: [0.6, 5],
    254: [1.7, 52.2],
    257: [1.9, 52],
    260: [1.5, 81.9],
    282: [1.6, 48.4],
    303: [0.6, 11.5],
    310: [1.5, 40.2],
    350: [6.2, 162],
    373: [1.5, 102.6],
    376: [1.6, 550],
    380: [1.4, 40],
    381: [2, 60],
    382: [4.5, 352],
    383: [3.5, 950],
    384: [7, 206.5],
    392: [1.2, 55],
    405: [1.4, 42],
    437: [1.3, 187],
    445: [1.9, 95],
    448: [1.2, 54],
    454: [1.3, 44.4],
    461: [1.1, 34],
    462: [1.2, 180],
    464: [2.4, 282.8],
    465: [2, 128.6],
    466: [1.8, 138.6],
    468: [1.5, 38],
    470: [1, 25.5],
    473: [2.5, 291],
    475: [1.6, 52],
    530: [0.7, 40.4],
    534: [1.4, 87],
    553: [1.5, 96.3],
    571: [1.6, 81.1],
    609: [1, 34.3],
    612: [1.8, 105.5],
    628: [1.5, 41],
    635: [1.8, 160],
    637: [1.6, 46],
    697: [2.5, 270],
    959: [0.7, 112.8],
  },
  STAT_LABELS = {
    spd: "Speed",
    sht: "Shooting",
    ins: "Finishing",
    pas: "Passing",
    def: "Perimeter D",
    blk: "Blocking",
    reb: "Rebounding",
    hnd: "Handles",
  },
  SPECIAL_EFFECTS = {
    surge: { label: "Surge", desc: "Unlimited turbo and +25% speed for 5 seconds." },
    lockin: { label: "Lock-In", desc: "Next shot is a guaranteed perfect release." },
    phase: { label: "Phase", desc: "Cannot be stolen from, shoved or blocked for 5 seconds." },
    blaze: { label: "Blaze", desc: "Instantly catch fire." },
    quake: { label: "Quake", desc: "Knocks down every opponent within 14 ft. Type matchups apply." },
    freeze: { label: "Freeze", desc: "Slows the whole opposing team for 5 seconds." },
  },
  SPECIAL_MOVES = {
    Electric: ["surge", "VOLT TACKLE"],
    Normal: ["surge", "EXTREME SPEED"],
    Flying: ["surge", "TAILWIND"],
    Psychic: ["lockin", "CALM MIND"],
    Fairy: ["lockin", "MOONBLAST"],
    Steel: ["lockin", "IRON FOCUS"],
    Ghost: ["phase", "PHANTOM FORCE"],
    Dark: ["phase", "SUCKER PUNCH"],
    Poison: ["phase", "TOXIC SPIKES"],
    Fire: ["blaze", "BLAST BURN"],
    Dragon: ["blaze", "OUTRAGE"],
    Ground: ["quake", "EARTHQUAKE"],
    Rock: ["quake", "ROCK SLIDE"],
    Fighting: ["quake", "CLOSE COMBAT"],
    Water: ["quake", "SURF"],
    Ice: ["freeze", "ICY WIND"],
    Grass: ["freeze", "SLEEP POWDER"],
    Bug: ["freeze", "STRING SHOT"],
  },
  POSITION_WEIGHTS = {
    PG: { spd: 0.2, sht: 0.2, pas: 0.2, hnd: 0.2, def: 0.1, ins: 0.1 },
    SG: { sht: 0.3, spd: 0.15, hnd: 0.15, ins: 0.15, def: 0.15, pas: 0.1 },
    SF: { sht: 0.2, ins: 0.2, def: 0.2, spd: 0.15, reb: 0.1, blk: 0.1, pas: 0.05 },
    PF: { ins: 0.25, reb: 0.2, blk: 0.15, def: 0.15, sht: 0.1, spd: 0.1, pas: 0.05 },
    C: { ins: 0.2, reb: 0.25, blk: 0.25, def: 0.1, pas: 0.1, sht: 0.05, spd: 0.05 },
  };
function calcOVR(a, e) {
  let t = 0;
  for (const [s, n] of Object.entries(POSITION_WEIGHTS[a])) t += e[s] * n;
  return Math.max(25, Math.min(99, Math.round((t - 60) * 1.25 + 58)));
}
function calcArchetype(a, e, t) {
  const s = a === "PF" || a === "C";
  return t < 50
    ? "Developmental Project"
    : s && e.blk >= 90
      ? "Rim Protector"
      : s && e.sht >= 85
        ? "Stretch Big"
        : s && e.pas >= 82
          ? a === "PF"
            ? "Point Forward"
            : "Point Center"
          : s && e.reb >= 90
            ? "Glass Cleaner"
            : s && e.ins >= 90
              ? "Post Scorer"
              : e.sht >= 90 && e.ins >= 88
                ? "Three-Level Scorer"
                : e.sht >= 88 && e.def >= 80
                  ? "3-and-D Wing"
                  : e.pas >= 88 && e.hnd >= 84
                    ? "Floor General"
                    : e.sht >= 90
                      ? "Sharpshooter"
                      : e.def >= 90
                        ? "Lockdown Defender"
                        : e.ins >= 88 && e.spd >= 84
                          ? "Slasher"
                          : e.spd >= 92
                            ? "Speedster"
                            : e.ins >= 88
                              ? "Rim Runner"
                              : s
                                ? "Hustle Big"
                                : "Role Player";
}
const STAR_ROSTER = [
    [150, "Mewtwo", ["Psychic"], "SF", 92, 96, 95, 88, 90, 86, 84, 86],
    [249, "Lugia", ["Psychic", "Flying"], "C", 88, 75, 84, 87, 89, 99, 92, 84],
    [250, "Ho-Oh", ["Fire", "Flying"], "C", 77, 81, 97, 88, 82, 93, 89, 80],
    [25, "Pikachu", ["Electric"], "PG", 94, 72, 62, 72, 66, 36, 42, 86],
    [65, "Alakazam", ["Psychic"], "PG", 86, 96, 55, 95, 60, 50, 50, 85],
    [94, "Gengar", ["Ghost", "Poison"], "SF", 86, 84, 80, 72, 88, 70, 62, 86],
    [6, "Charizard", ["Fire", "Flying"], "SF", 90, 90, 96, 72, 82, 80, 80, 80],
    [448, "Lucario", ["Fighting", "Steel"], "SG", 84, 86, 82, 78, 82, 58, 60, 84],
    [445, "Garchomp", ["Dragon", "Ground"], "PF", 92, 66, 96, 60, 84, 84, 82, 70],
    [149, "Dragonite", ["Dragon", "Flying"], "C", 74, 70, 92, 72, 76, 88, 92, 66],
    [384, "Rayquaza", ["Dragon", "Flying"], "PF", 84, 86, 96, 66, 82, 88, 90, 70],
    [151, "Mew", ["Psychic"], "PG", 92, 92, 80, 90, 78, 70, 68, 92],
    [257, "Blaziken", ["Fire", "Fighting"], "SF", 88, 76, 95, 68, 78, 74, 70, 80],
    [248, "Tyranitar", ["Rock", "Dark"], "C", 60, 58, 94, 56, 82, 92, 92, 58],
    [143, "Snorlax", ["Normal"], "C", 38, 56, 90, 68, 70, 94, 98, 48],
    [9, "Blastoise", ["Water"], "PF", 62, 92, 88, 72, 80, 88, 90, 64],
    [131, "Lapras", ["Water", "Ice"], "C", 52, 70, 78, 86, 68, 86, 90, 58],
    [376, "Metagross", ["Steel", "Psychic"], "C", 58, 64, 90, 70, 84, 94, 90, 60],
    [145, "Zapdos", ["Electric", "Flying"], "SF", 94, 84, 96, 68, 84, 82, 76, 74],
    [392, "Infernape", ["Fire", "Fighting"], "SG", 92, 82, 88, 72, 74, 55, 58, 86],
    [461, "Weavile", ["Dark", "Ice"], "PG", 94, 72, 78, 72, 92, 50, 52, 88],
    [196, "Espeon", ["Psychic"], "SG", 85, 93, 62, 86, 66, 48, 52, 84],
    [197, "Umbreon", ["Dark"], "SF", 78, 72, 66, 74, 93, 72, 70, 76],
    [282, "Gardevoir", ["Psychic", "Fairy"], "PG", 74, 90, 66, 88, 70, 72, 66, 78],
    [212, "Scizor", ["Bug", "Steel"], "SF", 82, 78, 86, 66, 94, 80, 74, 76],
    [130, "Gyarados", ["Water", "Flying"], "C", 70, 54, 92, 52, 76, 90, 92, 60],
    [68, "Machamp", ["Fighting"], "PF", 66, 52, 93, 60, 80, 82, 90, 62],
    [59, "Arcanine", ["Fire"], "SF", 94, 72, 88, 66, 76, 64, 68, 78],
    [466, "Electivire", ["Electric"], "PF", 72, 62, 92, 58, 78, 84, 86, 66],
    [26, "Raichu", ["Electric"], "PG", 92, 82, 74, 80, 74, 46, 50, 88],
    [135, "Jolteon", ["Electric"], "PG", 97, 80, 68, 78, 76, 42, 48, 90],
    [76, "Golem", ["Rock", "Ground"], "PF", 45, 48, 88, 50, 72, 88, 86, 50],
    [3, "Venusaur", ["Grass", "Poison"], "C", 52, 66, 89, 74, 74, 90, 93, 56],
    [106, "Hitmonlee", ["Fighting"], "SF", 84, 68, 90, 56, 78, 72, 60, 70],
    [107, "Hitmonchan", ["Fighting"], "SG", 82, 74, 72, 60, 88, 60, 58, 78],
    [122, "Mr. Mime", ["Psychic", "Fairy"], "PF", 64, 66, 60, 78, 90, 86, 70, 70],
    [133, "Eevee", ["Normal"], "PG", 76, 64, 56, 68, 58, 36, 42, 70],
    [7, "Squirtle", ["Water"], "PG", 66, 70, 52, 64, 60, 40, 46, 66],
    [54, "Psyduck", ["Water"], "PG", 60, 64, 52, 62, 50, 40, 46, 60],
    [79, "Slowpoke", ["Water", "Psychic"], "PF", 30, 72, 56, 70, 54, 62, 64, 58],
    [129, "Magikarp", ["Water"], "PG", 40, 30, 30, 30, 30, 25, 30, 35],
    [142, "Aerodactyl", ["Rock", "Flying"], "SG", 95, 70, 86, 64, 80, 62, 60, 80],
    [112, "Rhydon", ["Ground", "Rock"], "PF", 50, 48, 90, 46, 74, 88, 90, 52],
    [464, "Rhyperior", ["Ground", "Rock"], "C", 46, 52, 94, 46, 76, 90, 94, 50],
    [141, "Kabutops", ["Rock", "Water"], "SF", 82, 72, 84, 62, 84, 64, 62, 76],
    [139, "Omastar", ["Rock", "Water"], "PF", 48, 76, 72, 70, 74, 84, 84, 56],
    [185, "Sudowoodo", ["Rock"], "PF", 50, 54, 78, 54, 78, 76, 76, 54],
    [121, "Starmie", ["Water", "Psychic"], "PG", 92, 84, 62, 84, 70, 50, 50, 86],
    [134, "Vaporeon", ["Water"], "SF", 68, 76, 82, 74, 78, 82, 88, 62],
    [260, "Swampert", ["Water", "Ground"], "PF", 66, 60, 92, 60, 78, 84, 88, 62],
    [160, "Feraligatr", ["Water"], "SF", 76, 70, 90, 58, 84, 74, 80, 70],
    [230, "Kingdra", ["Water", "Dragon"], "SG", 82, 90, 72, 74, 72, 62, 62, 80],
    [350, "Milotic", ["Water"], "PF", 66, 72, 84, 84, 78, 86, 88, 62],
    [91, "Cloyster", ["Water", "Ice"], "C", 52, 58, 78, 52, 88, 94, 84, 50],
    [62, "Poliwrath", ["Water", "Fighting"], "PF", 64, 64, 88, 60, 82, 78, 82, 62],
    [181, "Ampharos", ["Electric"], "PF", 58, 80, 82, 70, 66, 78, 80, 60],
    [405, "Luxray", ["Electric"], "SF", 84, 74, 86, 62, 86, 66, 66, 76],
    [462, "Magnezone", ["Electric", "Steel"], "PF", 50, 70, 86, 60, 76, 90, 86, 48],
    [243, "Raikou", ["Electric"], "SG", 94, 86, 82, 72, 80, 60, 58, 86],
    [310, "Manectric", ["Electric"], "PG", 90, 76, 70, 70, 70, 44, 48, 84],
    [254, "Sceptile", ["Grass"], "PG", 95, 82, 76, 80, 74, 48, 52, 88],
    [45, "Vileplume", ["Grass", "Poison"], "PF", 46, 64, 76, 72, 70, 82, 82, 54],
    [71, "Victreebel", ["Grass", "Poison"], "SF", 70, 70, 82, 64, 82, 74, 70, 66],
    [154, "Meganium", ["Grass"], "C", 52, 60, 80, 80, 72, 84, 88, 58],
    [465, "Tangrowth", ["Grass"], "C", 48, 68, 90, 58, 76, 86, 92, 50],
    [470, "Leafeon", ["Grass"], "PG", 92, 80, 78, 80, 82, 50, 52, 84],
    [110, "Weezing", ["Poison"], "C", 40, 52, 70, 60, 78, 90, 86, 48],
    [89, "Muk", ["Poison"], "C", 36, 50, 84, 52, 76, 88, 94, 46],
    [34, "Nidoking", ["Poison", "Ground"], "PF", 76, 72, 90, 66, 80, 78, 80, 68],
    [31, "Nidoqueen", ["Poison", "Ground"], "PF", 68, 66, 86, 70, 82, 82, 86, 64],
    [169, "Crobat", ["Poison", "Flying"], "PG", 98, 76, 70, 78, 84, 48, 50, 88],
    [454, "Toxicroak", ["Poison", "Fighting"], "SF", 80, 70, 86, 62, 88, 70, 66, 74],
    [24, "Arbok", ["Poison"], "SF", 82, 66, 80, 58, 86, 68, 62, 72],
    [97, "Hypno", ["Psychic"], "PF", 56, 72, 70, 82, 80, 80, 78, 62],
    [475, "Gallade", ["Psychic", "Fighting"], "SF", 82, 72, 90, 68, 88, 70, 68, 74],
    [437, "Bronzong", ["Steel", "Psychic"], "C", 36, 58, 72, 60, 86, 92, 86, 46],
    [381, "Latios", ["Dragon", "Psychic"], "SF", 94, 92, 90, 82, 88, 76, 74, 86],
    [380, "Latias", ["Dragon", "Psychic"], "SF", 92, 86, 84, 90, 92, 78, 76, 82],
    [124, "Jynx", ["Ice", "Psychic"], "PG", 70, 84, 56, 86, 64, 56, 54, 80],
    [126, "Magmar", ["Fire"], "SF", 78, 80, 82, 66, 72, 66, 62, 74],
    [78, "Rapidash", ["Fire"], "PG", 96, 72, 74, 72, 70, 44, 48, 86],
    [38, "Ninetales", ["Fire"], "PG", 86, 86, 62, 86, 72, 52, 54, 84],
    [157, "Typhlosion", ["Fire"], "SF", 80, 86, 86, 64, 72, 66, 66, 76],
    [136, "Flareon", ["Fire"], "PF", 66, 64, 90, 58, 74, 74, 80, 62],
    [146, "Moltres", ["Fire", "Flying"], "SF", 89, 90, 97, 68, 82, 80, 74, 74],
    [229, "Houndoom", ["Dark", "Fire"], "SG", 88, 82, 78, 66, 84, 58, 58, 82],
    [637, "Volcarona", ["Bug", "Fire"], "SF", 78, 88, 72, 72, 72, 72, 66, 74],
    [105, "Marowak", ["Ground"], "SG", 70, 82, 74, 64, 80, 62, 64, 72],
    [530, "Excadrill", ["Ground", "Steel"], "SF", 84, 66, 92, 58, 80, 70, 70, 76],
    [383, "Groudon", ["Ground"], "PF", 74, 70, 96, 60, 84, 94, 96, 62],
    [382, "Kyogre", ["Water"], "C", 68, 88, 88, 70, 76, 93, 96, 60],
    [553, "Krookodile", ["Ground", "Dark"], "C", 80, 72, 88, 64, 84, 72, 78, 74],
    [473, "Mamoswine", ["Ice", "Ground"], "C", 52, 48, 90, 46, 74, 86, 92, 50],
    [144, "Articuno", ["Ice", "Flying"], "SF", 80, 89, 80, 74, 92, 94, 75, 72],
    [87, "Dewgong", ["Water", "Ice"], "C", 56, 62, 74, 70, 74, 82, 86, 54],
    [534, "Conkeldurr", ["Fighting"], "PF", 50, 48, 94, 56, 80, 82, 88, 56],
    [609, "Chandelure", ["Ghost", "Fire"], "SF", 66, 92, 76, 70, 64, 70, 62, 70],
    [373, "Salamence", ["Dragon", "Flying"], "PF", 86, 72, 94, 62, 80, 82, 84, 68],
    [612, "Haxorus", ["Dragon"], "SF", 84, 70, 96, 60, 82, 72, 72, 70],
    [635, "Hydreigon", ["Dark", "Dragon"], "SF", 84, 86, 88, 70, 80, 74, 72, 76],
    [128, "Tauros", ["Normal"], "SF", 92, 62, 88, 54, 78, 66, 62, 72],
    [115, "Kangaskhan", ["Normal"], "PF", 70, 64, 86, 72, 80, 76, 84, 70],
    [242, "Blissey", ["Normal"], "C", 42, 60, 60, 90, 50, 70, 99, 52],
    [468, "Togekiss", ["Fairy", "Flying"], "PG", 80, 84, 62, 92, 64, 62, 62, 80],
    [571, "Zoroark", ["Dark"], "PG", 90, 82, 74, 78, 80, 46, 50, 88],
    [123, "Scyther", ["Bug", "Flying"], "SG", 92, 74, 80, 62, 90, 58, 56, 82],
    [214, "Heracross", ["Bug", "Fighting"], "PF", 74, 56, 92, 54, 82, 80, 84, 62],
    [127, "Pinsir", ["Bug"], "PF", 70, 52, 86, 50, 84, 76, 78, 58],
    [303, "Mawile", ["Steel", "Fairy"], "PG", 72, 78, 66, 78, 84, 46, 48, 80],
    [628, "Braviary", ["Normal", "Flying"], "PF", 78, 62, 90, 60, 82, 80, 84, 64],
    [697, "Tyrantrum", ["Rock", "Dragon"], "C", 66, 54, 95, 54, 82, 88, 90, 58],
    [959, "Tinkaton", ["Fairy", "Steel"], "SG", 80, 82, 84, 70, 90, 66, 60, 78],
    [17, "Pidgeotto", ["Normal", "Flying"], "SF", 66, 60, 65, 56, 67, 52, 58, 61],
    [162, "Furret", ["Normal"], "SF", 77, 60, 75, 58, 72, 63, 68, 66],
    [11, "Metapod", ["Bug"], "C", 40, 50, 52, 48, 62, 56, 58, 48],
    [14, "Kakuna", ["Bug", "Poison"], "C", 44, 50, 54, 48, 64, 58, 58, 50],
    [55, "Golduck", ["Water"], "SG", 80, 82, 70, 72, 74, 55, 60, 78],
    [80, "Slowbro", ["Water", "Psychic"], "PF", 38, 84, 74, 80, 64, 78, 80, 62],
    [8, "Wartortle", ["Water"], "PG", 74, 78, 60, 72, 68, 46, 52, 74],
    [208, "Steelix", ["Steel", "Ground"], "C", 50, 44, 90, 48, 82, 98, 92, 50],
  ],
  MYTHICAL_ROSTER = [
    [658, "Greninja", ["Water", "Dark"], "SG", 94, 88, 78, 80, 82, 55, 58, 88],
    [887, "Dragapult", ["Dragon", "Ghost"], "SG", 98, 90, 80, 76, 80, 60, 56, 86],
    [807, "Zeraora", ["Electric"], "SG", 98, 76, 86, 70, 80, 50, 55, 87],
    [815, "Cinderace", ["Fire"], "SG", 93, 86, 84, 74, 72, 52, 56, 89],
    [701, "Hawlucha", ["Fighting", "Flying"], "SG", 90, 70, 90, 66, 76, 60, 58, 82],
    [745, "Lycanroc", ["Rock"], "SG", 92, 82, 82, 66, 78, 54, 56, 84],
    [730, "Primarina", ["Water", "Fairy"], "SG", 72, 88, 70, 86, 70, 70, 66, 78],
    [724, "Decidueye", ["Grass", "Ghost"], "SG", 80, 92, 70, 72, 80, 56, 58, 80],
    [812, "Rillaboom", ["Grass"], "PF", 66, 62, 92, 66, 80, 80, 84, 62],
    [778, "Mimikyu", ["Ghost", "Fairy"], "PG", 84, 82, 70, 84, 90, 52, 52, 86],
    [681, "Aegislash", ["Steel", "Ghost"], "PF", 58, 76, 82, 66, 92, 88, 76, 66],
    [706, "Goodra", ["Dragon"], "C", 52, 66, 84, 72, 80, 90, 90, 56],
    [700, "Sylveon", ["Fairy"], "SF", 70, 86, 66, 84, 72, 70, 68, 76],
  ];
function isMythical(a) {
  return MYTHICAL_ROSTER.some((e) => e[0] === a);
}
const clamp01 = (a) => Math.max(0, Math.min(1, a));
function sizeFactor(a, e) {
  const t = clamp01(((e.blk + e.reb) / 2 - 30) / 70),
    s = HEIGHT_WEIGHT[a],
    n = s ? 0.7 * clamp01(Math.log(s[0] / 0.3) / Math.log(20)) + 0.3 * clamp01(Math.log(s[1] / 2) / Math.log(200)) : t;
  return 0.8 + (0.5 * (t + n)) / 2;
}
function getMeasurements(a) {
  var t, s;
  const e = HEIGHT_WEIGHT[a];
  return { h: (t = e == null ? void 0 : e[0]) != null ? t : 0, w: (s = e == null ? void 0 : e[1]) != null ? s : 0 };
}
function buildPokemonEntry([a, e, t, s, n, o, r, i, l, c, h, d]) {
  const f = { spd: n, sht: o, ins: r, pas: i, def: l, blk: c, reb: h, hnd: d },
    u = calcOVR(s, f),
    [m, p] = SPECIAL_MOVES[t[0]];
  return {
    dex: a,
    name: e,
    types: t,
    pos: s,
    r: f,
    ovr: u,
    size: sizeFactor(a, f),
    archetype: calcArchetype(s, f, u),
    special: m,
    move: p,
  };
}
const STAR_DEX_SET = new Set(STAR_ROSTER.map((a) => a[0])),
  POKEMON_LIST = [...STAR_ROSTER, ...BASE_ROSTER.filter((a) => !STAR_DEX_SET.has(a[0]))].sort((a, e) => a[0] - e[0]).map(buildPokemonEntry),
  POKEMON_MAP = new Map([...POKEMON_LIST, ...MYTHICAL_ROSTER.map(buildPokemonEntry)].map((a) => [a.dex, a]));
function getPokemon(a) {
  const e = POKEMON_MAP.get(a);
  if (!e) throw new Error("Unknown Pokémon #".concat(a));
  return e;
}
function buildPlayer(a, e) {
  var o;
  const t = getPokemon(a),
    s = { ...t.r };
  for (const r of Object.keys(e)) s[r] = Math.min(99, s[r] + ((o = e[r]) != null ? o : 0));
  const n = calcOVR(t.pos, s);
  return { ...t, r: s, ovr: n, archetype: calcArchetype(t.pos, s, n), size: sizeFactor(a, s) };
}
const EVOLUTIONS = EVOLUTIONS_TABLE;
function weightsOf(a) {
  return POSITION_WEIGHTS[a];
}
const POSITION_ORDER = ["PG", "SG", "SF", "PF", "C"],
  TYPE_COLORS = {
    Normal: "#a8a77a",
    Fire: "#ee8130",
    Water: "#6390f0",
    Electric: "#f7d02c",
    Grass: "#7ac74c",
    Ice: "#96d9d6",
    Fighting: "#c22e28",
    Poison: "#a33ea1",
    Ground: "#e2bf65",
    Flying: "#a98ff3",
    Psychic: "#f95587",
    Bug: "#a6b91a",
    Rock: "#b6a136",
    Ghost: "#735797",
    Dragon: "#6f35fc",
    Dark: "#705746",
    Steel: "#b7b7ce",
    Fairy: "#d685ad",
  },
  TYPE_CHART = {
    Normal: [[], ["Rock", "Steel"], ["Ghost"]],
    Fire: [["Grass", "Ice", "Bug", "Steel"], ["Fire", "Water", "Rock", "Dragon"], []],
    Water: [["Fire", "Ground", "Rock"], ["Water", "Grass", "Dragon"], []],
    Electric: [["Water", "Flying"], ["Electric", "Grass", "Dragon"], ["Ground"]],
    Grass: [["Water", "Ground", "Rock"], ["Fire", "Grass", "Poison", "Flying", "Bug", "Dragon", "Steel"], []],
    Ice: [["Grass", "Ground", "Flying", "Dragon"], ["Fire", "Water", "Ice", "Steel"], []],
    Fighting: [["Normal", "Ice", "Rock", "Dark", "Steel"], ["Poison", "Flying", "Psychic", "Bug", "Fairy"], ["Ghost"]],
    Poison: [["Grass", "Fairy"], ["Poison", "Ground", "Rock", "Ghost"], ["Steel"]],
    Ground: [["Fire", "Electric", "Poison", "Rock", "Steel"], ["Grass", "Bug"], ["Flying"]],
    Flying: [["Grass", "Fighting", "Bug"], ["Electric", "Rock", "Steel"], []],
    Psychic: [["Fighting", "Poison"], ["Psychic", "Steel"], ["Dark"]],
    Bug: [["Grass", "Psychic", "Dark"], ["Fire", "Fighting", "Poison", "Flying", "Ghost", "Steel", "Fairy"], []],
    Rock: [["Fire", "Ice", "Flying", "Bug"], ["Fighting", "Ground", "Steel"], []],
    Ghost: [["Psychic", "Ghost"], ["Dark"], ["Normal"]],
    Dragon: [["Dragon"], ["Steel"], ["Fairy"]],
    Dark: [["Psychic", "Ghost"], ["Fighting", "Dark", "Fairy"], []],
    Steel: [["Ice", "Rock", "Fairy"], ["Fire", "Water", "Electric", "Steel"], []],
    Fairy: [["Fighting", "Dragon", "Dark"], ["Fire", "Poison", "Steel"], []],
  };
function Xt(a, e) {
  const [t, s, n] = TYPE_CHART[a];
  let o = 1;
  for (const r of e) {
    if (n.includes(r)) return 0;
    t.includes(r) ? (o *= 2) : s.includes(r) && (o *= 0.5);
  }
  return o;
}
function Va(a, e) {
  return Math.max(...a.map((t) => Xt(t, e)));
}
const xs = "./sprites";
function le(a, e = !1) {
  var n;
  const t = (e ? "b" : "f") + a,
    s = (n = window.__POKE_SPRITES) == null ? void 0 : n[t];
  return s || (e ? "".concat(xs, "/back/").concat(a, ".png") : "".concat(xs, "/").concat(a, ".png"));
}
const COURT_HALF_WIDTH = 94,
  COURT_MID_X = 50,
  COURT_MID_Y = 25,
  HOOP_OFFSET = 10,
  COURT_SCALE_W = 0.75,
  HOOP_RING_DIAMETER = 32,
  COURT_SCALE_H = 0.45;
function hoopXOf(a) {
  return a === 0 ? 88.75 : 5.25;
}
function sideSign(a) {
  return a === 0 ? -1 : 1;
}
function isOutsideCourt(a, e, t) {
  const s = a - hoopXOf(t),
    n = e - COURT_MID_Y,
    o = Math.hypot(s, n);
  return Math.abs(n) >= 22 && Math.abs(s) < 9 ? !0 : o >= 23.75;
}
const DIFFICULTY_LEVELS = {
    rookie: {
      label: "Rookie",
      cpuBoost: -14,
      green: 1.9,
      aggro: 0.3,
      react: 0.5,
      cpuShot: -0.1,
      contest: 0.5,
      assist: !0,
      catchup: 1,
    },
    pro: {
      label: "Pro",
      cpuBoost: -5,
      green: 1.35,
      aggro: 0.6,
      react: 0.3,
      cpuShot: -0.04,
      contest: 0.8,
      assist: !0,
      catchup: 0.5,
    },
    allstar: {
      label: "All-Star",
      cpuBoost: 0,
      green: 1.1,
      aggro: 0.9,
      react: 0.2,
      cpuShot: 0,
      contest: 0.9,
      assist: !1,
      catchup: 0,
    },
    legend: {
      label: "Legend",
      cpuBoost: 4,
      green: 0.85,
      aggro: 1.15,
      react: 0.12,
      cpuShot: 0.03,
      contest: 1,
      assist: !1,
      catchup: 0,
    },
  },
  ENGINE_VERSION = 3;
function makeEmptyInput() {
  return { mx: 0, my: 0, turbo: !1, shoot: !1, shootHeld: !1, pass: !1, steal: !1, special: !1, swap: !1 };
}
const clampNum = (a, e, t) => (a < e ? e : a > t ? t : a),
  lerpNum = (a, e, t) => a + (e - a) * t,
  re = (a, e) => a + Math.random() * (e - a);
function seededRng(a) {
  const e = () => {
    e.state = (e.state + 1831565813) >>> 0;
    let t = e.state;
    return (
      (t = Math.imul(t ^ (t >>> 15), t | 1)),
      (t ^= t + Math.imul(t ^ (t >>> 7), t | 61)),
      ((t ^ (t >>> 14)) >>> 0) / 4294967296
    );
  };
  return ((e.state = a >>> 0), e);
}
const dist2d = (a, e, t, s) => Math.hypot(a - t, e - s),
  SPAWN_POSITIONS = [
    [25, 25],
    [20, 7],
    [20, 43],
    [13, 35],
    [6, 16],
  ];
function Re(a, e, t, s, n = 14) {
  const o = t - a.x,
    r = s - a.y,
    i = Math.hypot(o, r);
  if (i < 0.6) return;
  const l = Math.min(1, i / 2.5);
  ((e.mx = (o / i) * l), (e.my = (r / i) * l), (e.turbo = i > n && a.turbo > 0.3));
}
function fa(a, e) {
  return (a - 47) * -sideSign(e) > 0;
}
function Qa(a, e, t, s, n, o) {
  const r = n - t,
    i = o - s,
    l = r * r + i * i || 1,
    c = clampNum(((a - t) * r + (e - s) * i) / l, 0, 1);
  return Math.hypot(a - (t + c * r), e - (s + c * i));
}
function Ms(a, e, t) {
  var r;
  const s = makeEmptyInput(),
    n = e.ai;
  if (
    ((n.think -= t),
    (n.jitterT -= t),
    (n.cutT -= t),
    e.state === "stun" || e.state === "dunk" || e.state === "hang" || a.phase === "tip" || a.phase === "break")
  )
    return s;
  n.jumpIn >= 0 && ((n.jumpIn -= t), n.jumpIn < 0 && e.z === 0 && (s.shoot = !0));
  const o = a.ball;
  return o.owner === e
    ? Za(a, e, s)
    : a.phase === "dead"
      ? (e.team === a.offense ? (Xa(a, e.team) === e ? Re(e, s, o.x, o.y) : Pt(a, e, s)) : xt(a, e, s, t), s)
      : o.mode === "loose" || o.mode === "shot"
        ? (tn(a, e, s, t), s)
        : o.mode === "pass" && ((r = o.pass) == null ? void 0 : r.to) === e
          ? (Re(e, s, (o.x + e.x) / 2, (o.y + e.y) / 2), s)
          : (e.team === a.offense ? Pt(a, e, s) : xt(a, e, s, t), s);
}
function Xa(a, e) {
  let t = null,
    s = 1 / 0;
  for (const n of a.players) {
    if (n.team !== e || n.state === "stun") continue;
    const o = dist2d(n.x, n.y, a.ball.x, a.ball.y);
    o < s && ((s = o), (t = n));
  }
  return t;
}
function Za(a, e, t) {
  var d;
  if (e.state !== "free") return t;
  const s = e.ai,
    n = hoopXOf(e.team),
    o = sideSign(e.team),
    r = a.distToHoop(e),
    i = fa(e.x, e.team);
  let l = null,
    c = 99;
  for (const f of a.opponents(e.team)) {
    if (f.state === "stun") continue;
    const u = dist2d(e.x, e.y, f.x, f.y);
    u < c && ((c = u), (l = f));
  }
  if (e.special >= 1) {
    const f = e.mon.special;
    ((f === "quake" && c < 6) || f === "freeze" || (i && r < 30 && f !== "quake")) && (t.special = !0);
  }
  const h = e.turbo > 0.25 || e.fx.surge > 0 || e.fire;
  if (s.think <= 0) {
    s.think = a.rand(0.18, 0.35);
    const f = a.dunkRange(e, h),
      u = e.r.sht >= 88 ? 27 : e.r.sht >= 78 ? 25.5 : e.r.sht >= 66 ? 20 : 12,
      m = !a
        .opponents(e.team)
        .some((b) => b.state !== "stun" && Qa(b.x, b.y, e.x, e.y, n, COURT_MID_Y) < 2.6 && dist2d(b.x, b.y, n, COURT_MID_Y) < r),
      p = a.teamPlayers(e.team).find((b) => b !== e && b.ai.cutT > 0 && a.distToHoop(b) < 12 && a.openness(b) > 4),
      y = a.time - e.lastCatch,
      v = isOutsideCourt(e.x, e.y, e.team);
    (y < 0.4 && (s.pullUp = a.rng() < (e.r.sht - 50) / 80),
      i
        ? a.shotClock < 3.2 || (r < f && (m || a.rng() < 0.08))
          ? (s.plan = "shoot")
          : r < 15 && !m && a.rng() < 0.3
            ? (s.plan = a.rng() < 0.5 ? "pass" : "jumper")
            : r < 7.5 && a.rng() < 0.65
              ? (s.plan = "shoot")
              : p && a.rng() < 0.5
                ? ((s.plan = "pass"), (t.passTo = p))
                : (v && r < u && c > 3 && y < 1 && a.rng() < 0.15 + (e.r.sht - 60) / 80) ||
                    (s.pullUp && r < Math.min(u, 26) && c > 2) ||
                    (r < u && c > 3.5 && y > 0.4 && a.rng() < 0.22 + (e.r.sht - 55) / 100)
                  ? (s.plan = "shoot")
                  : (c < 3.2 && a.rng() < 0.35) || (y > 1.2 && a.rng() < 0.14)
                    ? (s.plan = "pass")
                    : e.slot === 0 && y < 1.5 && a.rng() < 0.3
                      ? (s.plan = "hold")
                      : (s.plan = "drive")
        : (s.plan = "drive"),
      a.rng() < 0.3 && (s.dodge = a.rng() < 0.5 ? -1 : 1));
  }
  switch (s.plan) {
    case "shoot":
    case "jumper":
      return ((t.shoot = !0), (t.turbo = s.plan === "shoot" && h), (s.plan = "none"), t);
    case "pass":
      return (
        (t.pass = !0),
        t.passTo || (t.passTo = (d = en(a, e)) != null ? d : void 0),
        (t.turbo = !!t.passTo && t.passTo.ai.cutT > 0 && a.distToHoop(t.passTo) < 14),
        (s.plan = "none"),
        t
      );
    case "hold":
      return (Re(e, t, n + o * 25, COURT_MID_Y + (e.y < 25 ? -2 : 2)), (t.turbo = !1), t);
    default: {
      let u = (i ? n : n + o * 26) - e.x,
        m = COURT_MID_Y - e.y;
      const p = Math.hypot(u, m) || 1;
      if (
        ((u /= p),
        (m /= p),
        i && s.pullUp && r < 25.5 && ((u *= 0.15), (m *= 0.15)),
        l && c < 6 && ((l.x - e.x) * u + (l.y - e.y) * m) / (c || 1) > 0.4)
      ) {
        const v = -m * s.dodge,
          b = u * s.dodge;
        ((u = u * 0.45 + v * 0.9), (m = m * 0.45 + b * 0.9));
      }
      return (
        e.y < 4 && m < 0 && (s.dodge *= -1),
        e.y > 46 && m > 0 && (s.dodge *= -1),
        (t.mx = u),
        (t.my = m),
        (t.turbo = h && (!i || r < 32) && e.turbo > 0.35),
        t
      );
    }
  }
}
function en(a, e) {
  let t = null,
    s = -1 / 0;
  for (const n of a.teamPlayers(e.team)) {
    if (n === e || n.state === "stun") continue;
    const r = Math.min(a.openness(n), 10) * 1.2 + (40 - a.distToHoop(n)) * 0.08 + n.r.sht * 0.03 + a.rand(0, 3);
    r > s && ((s = r), (t = n));
  }
  return t;
}
function Pt(a, e, t) {
  const s = e.ai,
    n = hoopXOf(e.team),
    o = sideSign(e.team),
    [r, i] = SPAWN_POSITIONS[e.slot];
  let l = n + o * r,
    c = i;
  e.slot >= 3 && e.r.sht >= 85 && (l = n + o * 21);
  const h = a.ball.owner;
  (s.jitterT <= 0 &&
    ((s.jitterT = a.rand(1.5, 3.5)),
    (s.jx = a.rand(-3, 3)),
    (s.jy = a.rand(-3, 3)),
    h && h.team === e.team && fa(h.x, e.team) && a.rng() < 0.12 + e.r.ins / 500 && (s.cutT = a.rand(1.2, 2))),
    s.cutT > 0 ? ((l = n + o * 3), (c = COURT_MID_Y + (e.y < COURT_MID_Y ? -3 : 3))) : ((l += s.jx), (c += s.jy)),
    h && h !== e && dist2d(h.x, h.y, l, c) < 7 && (c += c < h.y ? -5 : 5),
    Re(e, t, l, clampNum(c, 2, 48)));
}
function xt(a, e, t, s) {
  const n = 1 - e.team,
    o = a.manOf(e),
    r = hoopXOf(n),
    i = a.ball,
    l = i.owner && i.owner.team === n ? i.owner : null;
  let c, h;
  if (l === o) {
    const d = dist2d(o.x, o.y, r, COURT_MID_Y) || 1;
    ((c = o.x + ((r - o.x) / d) * 3), (h = o.y + ((COURT_MID_Y - o.y) / d) * 3));
    const f = dist2d(e.x, e.y, o.x, o.y),
      u = a.aggro(e);
    a.phase === "live" &&
      f < 4.2 &&
      (a.rng() < s * 0.3 * u * (e.r.def / 100)
        ? (t.steal = !0)
        : e.turbo > 0.6 && a.rng() < s * 0.07 * u && ((t.steal = !0), (t.turbo = !0)));
  } else {
    const d = dist2d(o.x, o.y, r, COURT_MID_Y) || 1,
      f = clampNum(dist2d(o.x, o.y, i.x, i.y) / 4, 2.5, 8);
    if (
      ((c = o.x + ((r - o.x) / d) * f),
      (h = o.y + ((COURT_MID_Y - o.y) / d) * f),
      (c += (i.x - c) * 0.15),
      (h += (i.y - h) * 0.15),
      l &&
        e.slot >= 3 &&
        dist2d(l.x, l.y, r, COURT_MID_Y) < 15 &&
        a
          .teamPlayers(e.team)
          .filter((m) => m.slot >= 3)
          .sort((m, p) => dist2d(m.x, m.y, r, COURT_MID_Y) - dist2d(p.x, p.y, r, COURT_MID_Y))[0] === e)
    ) {
      const m = dist2d(l.x, l.y, r, COURT_MID_Y) || 1;
      ((c = r + ((l.x - r) / m) * 4), (h = COURT_MID_Y + ((l.y - COURT_MID_Y) / m) * 4));
    }
  }
  if (l && (l.state === "shoot" || l.state === "layup" || l.state === "dunk") && e.ai.jumpIn < 0 && e.z === 0) {
    const d = l.state === "dunk" ? 10 : 6.5;
    dist2d(e.x, e.y, l.x, l.y) < d && (e.ai.jumpIn = a.reactTime(e));
  }
  if (l && e.special >= 1 && !(a.cfg.practice && !a.teams[e.team].human)) {
    const d = e.mon.special,
      f = dist2d(e.x, e.y, l.x, l.y);
    ((d === "quake" && f < 9) || d === "freeze") && (t.special = !0);
  }
  Re(e, t, c, h, 10);
}
function tn(a, e, t, s) {
  const n = a.ball;
  if (n.mode === "shot" && n.shot) {
    const l = hoopXOf(n.shot.shooter.team),
      c = dist2d(e.x, e.y, l, COURT_MID_Y);
    if (c < 22 && (e.slot >= 2 || c < 12)) {
      const h = c || 1;
      Re(e, t, l + ((e.x - l) / h) * 4.5, COURT_MID_Y + ((e.y - COURT_MID_Y) / h) * 4.5, 99);
    } else e.team === a.offense ? Pt(a, e, t) : xt(a, e, t, s);
    return;
  }
  const r = a
      .teamPlayers(e.team)
      .filter((l) => l.state !== "stun")
      .sort((l, c) => dist2d(l.x, l.y, n.x, n.y) - dist2d(c.x, c.y, n.x, n.y))
      .indexOf(e),
    i = dist2d(e.x, e.y, n.x, n.y);
  if (r < 2 || i < 10) {
    Re(e, t, n.x + n.vx * 0.25, n.y + n.vy * 0.25, 6);
    const l = e.heightFt + 1.6;
    i < 3 && n.vz < 2 && n.z > l && n.z < l + 3.5 && e.z === 0 && (t.shoot = !0);
  } else e.team === a.offense ? Pt(a, e, t) : xt(a, e, t, s);
}
const FREE_THROW_SPOTS = [82, 19],
  Ht = [
    [20, 10],
    [20, 40],
    [14, 18],
    [14, 32],
    [10, 25],
  ],
  sn = [
    [62, 25],
    [70, 5],
    [70, 45],
    [86, 3],
    [86, 47],
  ],
  Ts = {
    movement: {
      userBall: !0,
      user: [
        [56, 25],
        [70, 5],
        [70, 45],
        [86, 3],
        [86, 47],
      ],
      cpu: Ht,
      cpuDribbleOnly: !1,
      shotClock: !1,
    },
    layups: {
      userBall: !0,
      user: [
        [74, 33],
        [64, 8],
        [62, 42],
        [86, 3],
        [86, 47],
      ],
      cpu: [
        [52, 30],
        [50, 12],
        [48, 40],
        [46, 20],
        [46, 32],
      ],
      cpuDribbleOnly: !1,
      shotClock: !1,
    },
    jumpshots: {
      userBall: !0,
      user: [
        [73, 25],
        [64, 6],
        [64, 44],
        [86, 3],
        [86, 47],
      ],
      cpu: [
        [52, 25],
        [50, 10],
        [50, 40],
        [46, 18],
        [46, 32],
      ],
      cpuDribbleOnly: !1,
      shotClock: !1,
    },
    passing: { userBall: !0, user: sn, cpu: Ht, cpuDribbleOnly: !1, shotClock: !1 },
    alleyoop: {
      userBall: !0,
      user: [[64, 25], [66, 4], [66, 46], [70, 44], FREE_THROW_SPOTS],
      cpu: Ht,
      cpuDribbleOnly: !1,
      shotClock: !1,
      holdSpots: !0,
    },
    defense: {
      userBall: !1,
      user: [
        [28, 25],
        [20, 10],
        [20, 40],
        [12, 18],
        [12, 32],
      ],
      cpu: [
        [36, 25],
        [26, 6],
        [26, 44],
        [16, 14],
        [16, 36],
      ],
      cpuDribbleOnly: !1,
      shotClock: !0,
    },
    steals: {
      userBall: !1,
      user: [
        [38, 25],
        [70, 5],
        [70, 45],
        [86, 3],
        [86, 47],
      ],
      cpu: [
        [42, 25],
        [20, 6],
        [20, 44],
        [10, 14],
        [10, 36],
      ],
      cpuDribbleOnly: !0,
      shotClock: !1,
    },
  },
  an = [
    [66, 10],
    [80, 40],
    [84, 14],
    [62, 38],
    [76, 25],
    [58, 12],
  ],
  nn = 2.5,
  Mt = (a, e) => (e === 0 ? a : COURT_HALF_WIDTH - a),
  Cr = (a) => ({ x: Mt(FREE_THROW_SPOTS[0], a), y: FREE_THROW_SPOTS[1] });
function on(a, e) {
  const t = an[a];
  return t ? { x: Mt(t[0], e), y: t[1] } : null;
}
function Gr(a, e, t) {
  const s = on(e, t);
  return !!s && Math.hypot(a.x - s.x, a.y - s.y) <= nn;
}
const rt = 0.8,
  rn = 0.62,
  $s = 1;
function Ot(a) {
  return new Set(a.map((e) => e.pos)).size === 5 ? 2 : 0;
}
function Rt(a) {
  return a.length ? Math.round(a.reduce((e, t) => e + t.ovr, 0) / a.length) + Ot(a) : 0;
}
function ln(a) {
  return clampNum(Math.round(35 + a.r.reb * 0.45 + a.r.def * 0.15), 40, 99);
}
const cn = {
  PG: ["SG", "SF", "PF", "C"],
  SG: ["PG", "SF", "PF", "C"],
  SF: ["SG", "PF", "PG", "C"],
  PF: ["C", "SF", "SG", "PG"],
  C: ["PF", "SF", "SG", "PG"],
};
function ye(a) {
  const e = [...a].sort((o, r) => r.ovr - o.ovr),
    t = POSITION_ORDER.map(() => null);
  (POSITION_ORDER.forEach((o, r) => {
    const i = e.findIndex((l) => l.pos === o);
    i >= 0 && (t[r] = e.splice(i, 1)[0]);
  }),
    POSITION_ORDER.forEach((o, r) => {
      if (!(t[r] || !e.length))
        for (const i of cn[o]) {
          const l = e.findIndex((c) => c.pos === i);
          if (l >= 0) {
            t[r] = e.splice(l, 1)[0];
            return;
          }
        }
    }));
  const s = [],
    n = [];
  return (
    t.forEach((o, r) => {
      o && (s.push(o), n.push(POSITION_ORDER[r]));
    }),
    { starters: s, bench: e, slots: n }
  );
}
function Es(a, e, t, s, n, o) {
  const r = { ...s.r };
  for (const i of Object.keys(r)) r[i] = clampNum(r[i] + n, 20, 99);
  return {
    id: a,
    team: e,
    slot: t,
    mon: s,
    r,
    size: s.size,
    heightFt: 2.8 + s.size * 1.7,
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    facing: e === 0 ? 1 : -1,
    back: !1,
    runPhase: o() * 6,
    state: "free",
    stateT: 0,
    turbo: 1,
    turboOn: !1,
    special: 0.2,
    fire: !1,
    fireMakes: 0,
    streak: 0,
    stealCd: 0,
    meter: 0,
    releaseAt: rt,
    dunk: null,
    fx: { surge: 0, phase: 0, slow: 0, lockin: !1 },
    stats: {
      pts: 0,
      fgm: 0,
      fga: 0,
      tpm: 0,
      tpa: 0,
      reb: 0,
      ast: 0,
      stl: 0,
      blk: 0,
      dnk: 0,
      sec: 0,
      gs: t >= 0 ? 1 : 0,
    },
    ai: {
      think: 0,
      tx: 0,
      ty: 0,
      jitterT: 0,
      jx: 0,
      jy: 0,
      cutT: 0,
      jumpIn: -1,
      plan: "none",
      planT: 0,
      dodge: 1,
      pullUp: !1,
    },
    intent: makeEmptyInput(),
    human: !1,
    lastCatch: -9,
    lastPasser: null,
    energy: 1,
    stamina: ln(s),
    starter: t >= 0,
    rotation: t,
    hurt: 0,
  };
}
class MatchEngine {
  constructor(e) {
    var s, n, o, r;
    if (
      ((this.players = []),
      (this.bench = []),
      (this.pendingSubs = []),
      (this.score = [0, 0]),
      (this.offense = 0),
      (this.quarter = 1),
      (this.shotClock = 24),
      (this.phase = "tip"),
      (this.tipoff = null),
      (this.celebrateT = 0),
      (this.matchups = new Map()),
      (this.phaseT = 0),
      (this.time = 0),
      (this.users = [null, null]),
      (this.inputs = [makeEmptyInput(), makeEmptyInput()]),
      (this.viewTeam = 0),
      (this.markers = []),
      (this.engineVersion = ENGINE_VERSION),
      (this.events = []),
      (this.sfx = []),
      (this.shake = 0),
      (this.rimShake = [0, 0]),
      (this.netT = [0, 0]),
      (this.paused = !1),
      (this.dribblePh = 0),
      (this.drillId = null),
      (this.drillLooseT = 0),
      e.engineVersion !== void 0 && e.engineVersion !== ENGINE_VERSION)
    )
      throw new Error("game was recorded on engine v".concat(e.engineVersion, ", this is engine v").concat(ENGINE_VERSION));
    ((this.cfg = e),
      (this.teams = [e.home, e.away]),
      (this.diff = DIFFICULTY_LEVELS[e.difficulty]),
      (this.seed = ((s = e.seed) != null ? s : Math.floor(Math.random() * 2 ** 32)) >>> 0),
      (this.rng = seededRng(this.seed)),
      (this.vsCpu = e.home.human !== e.away.human));
    let t = 0;
    for (const i of [0, 1]) {
      const l = this.teams[i],
        c = [...l.roster].sort((f, u) => POSITION_ORDER.indexOf(f.pos) - POSITION_ORDER.indexOf(u.pos)),
        h = !l.human && e.home.human ? this.diff.cpuBoost : 0,
        d = Ot(l.roster) + h + ((n = l.boost) != null ? n : 0);
      (c.forEach((f, u) => this.players.push(Es(t++, i, u, f, d, this.rng))),
        ((o = l.bench) != null ? o : []).forEach((f, u) => {
          const m = Es(t++, i, -1, f, d, this.rng);
          ((m.rotation = 5 + u), this.bench.push(m));
        }));
    }
    (this.assignMatchups(),
      (this.drillId = e.practice && (r = e.drill) != null ? r : null),
      (this.clock = e.quarterLen),
      (this.tipWinner = this.rng() < 0.5 ? 0 : 1),
      (this.ball = {
        x: 47,
        y: 25,
        z: 4,
        vx: 0,
        vy: 0,
        vz: 0,
        mode: "loose",
        owner: null,
        shot: null,
        pass: null,
        fromShot: -1,
        lastTouch: 0,
        noPickup: 0,
        spin: 0,
      }),
      this.startQuarter());
  }
  get user() {
    return this.users[this.viewTeam];
  }
  get userInput() {
    return this.inputs[this.viewTeam];
  }
  set userInput(e) {
    this.inputs[this.viewTeam] = e;
  }
  rand(e, t) {
    return e + this.rng() * (t - e);
  }
  randn() {
    const e = 1 - this.rng(),
      t = this.rng();
    return Math.sqrt(-2 * Math.log(e)) * Math.cos(2 * Math.PI * t);
  }
  humanTeams() {
    return [0, 1].filter((e) => this.teams[e].human);
  }
  setUser(e, t) {
    for (const s of this.players) s.team === e && (s.human = s === t);
    this.users[e] = t;
  }
  teamPlayers(e) {
    return this.players.filter((t) => t.team === e);
  }
  rosterOf(e) {
    return [...this.players, ...this.bench].filter((t) => t.team === e).sort((t, s) => t.id - s.id);
  }
  effort(e) {
    return e.energy >= 0.55 ? 1 : 0.82 + 0.18 * (e.energy / 0.55);
  }
  opponents(e) {
    return this.players.filter((t) => t.team !== e);
  }
  distToHoop(e) {
    return dist2d(e.x, e.y, hoopXOf(e.team), COURT_MID_Y);
  }
  dunkRange(e, t) {
    let s = t ? 3 + e.r.ins * 0.09 : 4.2;
    return (e.fire && (s += 4), s);
  }
  openness(e) {
    let t = 99;
    for (const s of this.players) s.team === e.team || s.state === "stun" || (t = Math.min(t, dist2d(e.x, e.y, s.x, s.y)));
    return t;
  }
  catchup() {
    return !this.vsCpu || !this.teams[0].human || !this.diff.catchup
      ? 0
      : clampNum((this.score[1] - this.score[0] - 6) / 10, 0, 1) * this.diff.catchup;
  }
  manOf(e) {
    var t, s;
    return (s =
      (t = this.matchups.get(e)) != null ? t : this.players.find((n) => n.team !== e.team && n.slot === e.slot)) != null
      ? s
      : this.players.find((n) => n.team !== e.team);
  }
  assignMatchups() {
    const e = (l) => POSITION_ORDER.indexOf(l.mon.pos);
    for (const l of [0, 1])
      this.teamPlayers(l)
        .sort((c, h) => e(c) - e(h) || c.slot - h.slot)
        .forEach((c, h) => (c.slot = h));
    const t = this.teamPlayers(0).sort((l, c) => l.slot - c.slot),
      s = this.teamPlayers(1).sort((l, c) => l.slot - c.slot),
      n = (l, c) => Math.abs(e(l) - e(c)) ** 2 * 10 + Math.abs(l.slot - c.slot);
    let o = [0, 1, 2, 3, 4],
      r = 1 / 0;
    const i = (l, c) => {
      if (!l.length) {
        const h = c.reduce((d, f, u) => d + n(t[u], s[f]), 0);
        h < r && ((r = h), (o = c));
        return;
      }
      l.forEach((h, d) => i([...l.slice(0, d), ...l.slice(d + 1)], [...c, h]));
    };
    (i([0, 1, 2, 3, 4].slice(0, s.length), []),
      this.matchups.clear(),
      o.forEach((l, c) => {
        !t[c] || !s[l] || (this.matchups.set(t[c], s[l]), this.matchups.set(s[l], t[c]));
      }));
  }
  greenWindow(e) {
    const t = e.human ? this.diff.green * (1 + 0.3 * this.catchup()) : 1;
    return (0.022 + (e.r.sht / 100) * 0.034) * t * (e.fire ? 1.7 : 1);
  }
  isHumanTeam(e) {
    return this.teams[e].human;
  }
  reactTime(e) {
    return this.cfg.practice && this.vsCpu && !this.teams[e.team].human
      ? 1.5 + this.rand(0, 0.08)
      : (this.vsCpu && this.cfg.home.human && e.team === 1 ? this.diff.react : 0.2) +
          ((100 - e.r.def) / 100) * 0.25 +
          this.rand(0, 0.08);
  }
  aggro(e) {
    return this.cfg.practice && this.vsCpu && !this.teams[e.team].human
      ? 0
      : this.vsCpu && this.cfg.home.human && e.team === 1
        ? this.diff.aggro * (1 - 0.5 * this.catchup())
        : 0.85;
  }
  startQuarter() {
    const e = this.quarter,
      t = e > 4 ? (this.rng() < 0.5 ? 0 : 1) : 1 - this.tipWinner;
    if (
      ((this.clock = e > 4 ? Math.max(30, Math.round(this.cfg.quarterLen / 2)) : this.cfg.quarterLen),
      (this.shotClock = 24),
      this.cfg.stamina && e > 1)
    ) {
      const i = e === 3 ? 0.3 : 0.15;
      for (const l of [...this.players, ...this.bench]) l.energy = Math.min(1, l.energy + i);
      (this.applyPendingSubs(), this.autoSubs(0, !0), this.autoSubs(1, !0));
    }
    const s = [
      [4, 25],
      [12, 9],
      [12, 41],
      [21, 17],
      [21, 33],
    ];
    for (const i of this.players) {
      const [l, c] = s[i.slot];
      ((i.x = 47 + (i.team === 0 ? -l : l)),
        (i.y = c),
        (i.z = 0),
        (i.vx = 0),
        (i.vy = 0),
        (i.vz = 0),
        (i.state = "free"),
        (i.stateT = 0),
        (i.dunk = null),
        (i.meter = 0),
        (i.fx.slow = 0),
        (i.fx.phase = 0),
        (i.fx.surge = 0),
        (i.facing = i.team === 0 ? 1 : -1),
        (i.ai.jumpIn = -1),
        (i.ai.plan = "none"));
    }
    if (this.drillId) return this.stageDrill();
    const n =
      e > 4 ? (e === 5 ? "OVERTIME" : "".concat(e - 4, "OT")) : ["1ST", "2ND", "3RD", "4TH"][e - 1] + " QUARTER";
    this.phase = "tip";
    let o = t;
    if (this.cfg.practice && e === 1) o = this.tipWinner = this.teams[0].human ? 0 : 1;
    else if (e === 1 || e === 3) {
      (this.setupJump(), this.events.push({ kind: "quarter", label: n, sub: "JUMP BALL" }));
      return;
    }
    this.offense = o;
    const r = this.players.find((i) => i.team === o && i.slot === 0);
    (this.giveBall(r, !0),
      (this.phaseT = 1.8),
      this.updateUser(!0),
      this.events.push({ kind: "quarter", label: n, sub: "".concat(this.teams[o].abbr, " BALL") }),
      this.sfx.push("whistle"));
  }
  get drill() {
    return this.drillId;
  }
  setDrill(e) {
    this.cfg.practice && ((this.drillId = e), e && this.stageDrill());
  }
  practiceUser() {
    return this.teams[0].human ? 0 : 1;
  }
  holdSpotIntent(e, t) {
    var c;
    const s = makeEmptyInput(),
      [n, o] = (c = (e.team === this.practiceUser() ? t.user : t.cpu)[e.slot]) != null ? c : [47, 25],
      r = Mt(n, this.practiceUser()) - e.x,
      i = o - e.y,
      l = Math.hypot(r, i);
    if (l >= 0.6) {
      const h = Math.min(1, l / 2.5) / l;
      ((s.mx = r * h), (s.my = i * h));
    }
    return s;
  }
  stageDrill() {
    var o;
    const e = Ts[this.drillId],
      t = this.practiceUser();
    for (const r of this.players) {
      const [i, l] = (o = (r.team === t ? e.user : e.cpu)[r.slot]) != null ? o : [47, 25];
      ((r.x = Mt(i, t)),
        (r.y = l),
        (r.z = 0),
        (r.vx = 0),
        (r.vy = 0),
        (r.vz = 0),
        (r.state = "free"),
        (r.stateT = 0),
        (r.dunk = null),
        (r.meter = 0),
        (r.facing = r.team === 0 ? 1 : -1),
        (r.ai.jumpIn = -1),
        (r.ai.plan = "none"),
        (r.streak = 0),
        (r.fireMakes = 0),
        r.fire && ((r.fire = !1), this.events.push({ kind: "fire", player: r, on: !1 })));
    }
    const s = e.userBall ? t : 1 - t,
      n = this.ball;
    ((this.tipoff = null),
      (n.fromShot = -1),
      (n.noPickup = 0),
      (n.vx = 0),
      (n.vy = 0),
      (n.vz = 0),
      (this.offense = s),
      (this.shotClock = 24),
      this.giveBall(
        this.players.find((r) => r.team === s && r.slot === 0),
        !0,
      ),
      this.updateUser(!0),
      e.userBall ||
        this.setUser(
          t,
          this.players.find((r) => r.team === t && r.slot === 0),
        ),
      (this.phase = "tip"),
      (this.phaseT = 0.6));
  }
  jumperOf(e) {
    const t = (s) => s.r.blk * 0.5 + s.r.reb * 0.3 + s.size * 30;
    return this.teamPlayers(e).reduce((s, n) => (t(n) > t(s) ? n : s));
  }
  setupJump() {
    const e = this.jumperOf(0),
      t = this.jumperOf(1),
      s = [
        [-9, -6],
        [-9, 6],
        [4, -10],
        [4, 10],
      ];
    for (const l of [0, 1]) {
      const c = l === 0 ? e : t,
        h = l === 0 ? -1 : 1;
      ((c.x = 47 + h * 1.3),
        (c.y = 25),
        this.teamPlayers(l)
          .filter((d) => d !== c)
          .forEach((d, f) => {
            ((d.x = 47 + h * -s[f][0]), (d.y = 25 + s[f][1]));
          }));
    }
    const n = [this.isHumanTeam(0), this.isHumanTeam(1)],
      o = (l) => (this.vsCpu && this.teams[0].human && !n[l] ? 0.2 - this.diff.cpuBoost * 0.012 : 0.2),
      r = (l) => 1 + (this.rng() + this.rng() + this.rng() - 1.5) * o(l) * 1.4;
    this.tipoff = {
      t: -1.3,
      jumpers: [e, t],
      ENGINE_VERSION: [null, null],
      plan: [r(0), r(1)],
      window: 0.08 * this.diff.green,
      to: null,
      fly: 0,
    };
    const i = this.ball;
    ((i.owner = null),
      (i.mode = "loose"),
      (i.x = 47),
      (i.y = 25),
      (i.z = 4.5),
      (i.vx = 0),
      (i.vy = 0),
      (i.vz = 0),
      (i.noPickup = 99),
      (this.phaseT = 99));
    for (const l of this.humanTeams()) this.setUser(l, l === 0 ? e : t);
  }
  jumpMeter() {
    return this.tipoff ? Math.max(0, this.tipoff.t) / $s : 0;
  }
  updateJump(e) {
    var m;
    const t = this.tipoff,
      s = this.ball;
    t.t += e;
    for (const p of this.players) this.movePlayer(p, e);
    if (t.to) {
      t.fly += e / 0.5;
      const p = Math.min(1, t.fly);
      if (
        ((s.x += (t.to.x - s.x) * Math.min(1, p * 0.6 + 0.1)),
        (s.y += (t.to.y - s.y) * Math.min(1, p * 0.6 + 0.1)),
        (s.z += (4 - s.z) * Math.min(1, e * 6)),
        p >= 1)
      ) {
        const y = t.to.team;
        ((this.tipoff = null),
          (s.noPickup = 0),
          (this.tipWinner = y),
          (this.phase = "live"),
          (this.offense = 1 - y),
          this.giveBall(t.to),
          this.updateUser(!0));
      }
      return;
    }
    if (t.t < 0) return;
    t.t < e && this.sfx.push("whistle");
    const n = $s + 0.35,
      o = Math.min(t.t, 2 * n);
    s.z = 4.5 + 5 * (1 - ((o - n) / n) ** 2);
    const r = this.jumpMeter();
    for (const p of [0, 1]) {
      if (t.ENGINE_VERSION[p] !== null) continue;
      const y = t.jumpers[p],
        v = this.teams[p].human && y.human;
      if ((v ? this.inputs[p].shoot || r >= 1.7 : r >= t.plan[p]) && ((t.ENGINE_VERSION[p] = r), (y.vz = 15), (y.z = 0.01), v)) {
        const k = r - 1,
          w = Math.abs(k),
          P =
            w <= t.window
              ? "perfect"
              : w <= t.window * 2
                ? "good"
                : w <= 0.3
                  ? k < 0
                    ? "early"
                    : "late"
                  : k < 0
                    ? "very-early"
                    : "very-late";
        this.events.push({ kind: "release", player: y, grade: P });
      }
    }
    if (t.ENGINE_VERSION[0] === null || t.ENGINE_VERSION[1] === null) return;
    const i = Math.max(t.ENGINE_VERSION[0], t.ENGINE_VERSION[1]);
    if (r < Math.max(1.3, i + 0.3)) return;
    const l = (p) => Math.max(0, 1 - Math.abs(t.ENGINE_VERSION[p] - 1) / 0.45),
      c = (p) => (p.r.blk * 0.5 + p.r.reb * 0.3 + p.r.spd * 0.2) / 100 + (p.size - 1) * 0.4,
      h = (p) => l(p) * 0.65 + c(t.jumpers[p]) * 0.35 + this.rng() * 0.06,
      d = h(0) >= h(1) ? 0 : 1,
      f = t.jumpers[d],
      u = this.teamPlayers(d).filter((p) => p !== f);
    ((t.to = (m = u.find((p) => p.slot === 0)) != null ? m : u[0]),
      (t.fly = 0),
      (s.x = (t.jumpers[0].x + t.jumpers[1].x) / 2 + (d === 0 ? -0.5 : 0.5)),
      this.sfx.push("block"),
      this.events.push({ kind: "jumpball", winner: f, loser: t.jumpers[1 - d] }));
  }
  endQuarter() {
    this.sfx.push("buzzer");
    const [e, t] = this.score;
    if (this.quarter >= 4 && e !== t) {
      ((this.phase = "final"), this.events.push({ kind: "final" }));
      return;
    }
    const s =
        this.quarter === 2 ? "HALFTIME" : this.quarter >= 4 ? "END OF REGULATION" : "END OF Q".concat(this.quarter),
      n =
        this.quarter >= 4
          ? "TIED! GOING TO OVERTIME"
          : "".concat(this.teams[0].abbr, " ").concat(e, " - ").concat(t, " ").concat(this.teams[1].abbr);
    (this.events.push({ kind: "quarter", label: s, sub: n }),
      this.quarter++,
      (this.phase = "break"),
      (this.phaseT = 2.6));
  }
  setOffense(e, t = 24) {
    const s = e !== this.offense;
    ((this.offense = e), (this.shotClock = t), s && this.updateUser(!0));
  }
  giveBall(e, t = !1) {
    const s = this.ball;
    ((s.owner = e),
      (s.mode = "held"),
      (s.shot = null),
      (s.pass = null),
      (s.lastTouch = e.team),
      (e.lastCatch = this.time),
      (e.ai.think = Math.min(e.ai.think, this.rand(0.1, 0.3))),
      e.team !== this.offense && this.setOffense(e.team));
    const n = 1 - e.team;
    (this.teams[n].human && this.autoSwitch(n, e), t || this.sfx.push("catch"));
  }
  updateUser(e = !1, t = !1, s) {
    for (const n of this.humanTeams()) (s === void 0 || s === n) && this.updateTeamUser(n, e, t);
  }
  updateTeamUser(e, t, s) {
    const n = this.ball;
    let o = this.users[e];
    if (n.owner && n.owner.team === e) o = n.owner;
    else if (!o || t || s) {
      const i = s && !t ? o : null;
      let l = null,
        c = 1 / 0;
      for (const h of this.teamPlayers(e)) {
        if (h === i) continue;
        const d = dist2d(h.x, h.y, n.x, n.y) + (h.state === "stun" ? 20 : 0);
        d < c && ((c = d), (l = h));
      }
      l && (o = l);
    }
    this.setUser(e, o);
  }
  autoSwitch(e, t) {
    if (this.cfg.autoSwitch === !1) return;
    const s = this.users[e],
      n = (h) => h.state !== "stun";
    if (s && n(s) && dist2d(s.x, s.y, t.x, t.y) < 6) return;
    const o = this.teamPlayers(e).filter(n);
    if (!o.length) return;
    const r = (h) => dist2d(h.x, h.y, t.x, t.y),
      i = o.find((h) => this.manOf(h) === t),
      l = o.reduce((h, d) => (r(d) < r(h) ? d : h)),
      c = i && r(i) < r(l) + 8 ? i : l;
    c !== s && this.setUser(e, c);
  }
  userIntent(e, t) {
    const s = this.inputs[e.team],
      n = this.ball,
      o = n.owner ? n.owner.team !== e.team : n.mode !== "held";
    if (!this.vsCpu || !this.diff.assist || !o || Math.hypot(s.mx, s.my) > 0.15 || e.state !== "free") return s;
    const r = Ms(this, e, t);
    return { ...s, mx: r.mx, my: r.my, turbo: s.turbo || r.turbo };
  }
  update(e) {
    var o;
    if (this.paused || this.phase === "final") return;
    ((this.time += e), (this.shake = Math.max(0, this.shake - e * 2.5)));
    for (const r of [0, 1])
      ((this.rimShake[r] = Math.max(0, this.rimShake[r] - e * 3)), (this.netT[r] = Math.max(0, this.netT[r] - e)));
    if (this.phase === "break") {
      ((this.phaseT -= e), this.phaseT <= 0 && this.startQuarter());
      return;
    }
    if (this.phase === "tip" && this.tipoff) {
      this.updateJump(e);
      return;
    }
    if (this.phase === "tip") {
      ((this.phaseT -= e), this.updateBall(e), this.phaseT <= 0 && (this.phase = "live"));
      return;
    }
    const t = this.ball,
      s = this.phase === "live",
      n = this.drillId ? Ts[this.drillId] : null;
    s
      ? (n || (this.clock -= e),
        this.tickStamina(e),
        (t.mode === "held" || t.mode === "pass" || (t.mode === "loose" && t.fromShot === -1)) &&
          (!n || n.shotClock) &&
          (this.shotClock -= e))
      : this.phase === "dead" && ((this.phaseT -= e), this.phaseT <= 0 && this.inbound());
    for (const r of this.humanTeams())
      this.inputs[r].swap && !(t.owner && t.owner === this.users[r])
        ? this.updateUser(!1, !0, r)
        : ((o = t.owner) == null ? void 0 : o.team) === r && this.users[r] !== t.owner && this.updateUser(!1, !1, r);
    for (const r of this.players)
      ((r.intent = r.human ? this.userIntent(r, e) : Ms(this, r, e)),
        n != null &&
          n.cpuDribbleOnly &&
          !r.human &&
          t.owner === r &&
          (r.intent = { ...r.intent, shoot: !1, shootHeld: !1, pass: !1, special: !1, passTo: void 0 }),
        n != null && n.holdSpots && !r.human && t.owner !== r && (r.intent = this.holdSpotIntent(r, n)));
    for (const r of this.players) (this.phase === "live" && this.act(r, e), this.movePlayer(r, e));
    if (
      (this.separate(),
      this.updateBall(e),
      n != null && n.holdSpots && this.phase === "live" && t.mode === "loose"
        ? ((this.drillLooseT += e),
          this.drillLooseT > 1.2 && ((this.drillLooseT = 0), (this.phase = "dead"), (this.phaseT = 0.5)))
        : (this.drillLooseT = 0),
      n && this.phase === "live" && t.owner && t.mode === "held")
    ) {
      const r = this.practiceUser();
      (t.owner.team === r) !== n.userBall
        ? ((this.phase = "dead"), (this.phaseT = 1))
        : n.holdSpots && t.owner.slot !== 0 && t.owner.state === "free" && ((this.phase = "dead"), (this.phaseT = 0.8));
    }
    if (this.phase === "live" || this.phase === "dead") {
      this.celebrateT = Math.max(0, this.celebrateT - e);
      const r =
        t.mode === "shot" || this.celebrateT > 0 || this.players.some((i) => i.state === "dunk" || i.state === "layup");
      if (this.clock <= 0 && !r) {
        ((this.clock = 0), this.endQuarter());
        return;
      }
      (this.clock < 0 && (this.clock = 0), s && this.shotClock <= 0 && !r && this.shotClockViolation());
    }
  }
  shotClockViolation() {
    const e = this.ball;
    if ((this.events.push({ kind: "shotclock", team: this.offense }), this.sfx.push("shotclock"), e.owner)) {
      const t = e.owner;
      ((e.owner = null), (e.mode = "loose"), (e.vx = 0), (e.vy = 0), (e.vz = 3), (e.x = t.x), (e.y = t.y));
    }
    ((e.fromShot = -1), this.setOffense(1 - this.offense), (this.phase = "dead"), (this.phaseT = 1));
  }
  inbound() {
    if (this.drillId) return this.stageDrill();
    (this.applyPendingSubs(), this.autoSubs(0, !1), this.autoSubs(1, !1));
    const e = this.ball;
    let t = null,
      s = 1 / 0;
    for (const n of this.teamPlayers(this.offense)) {
      if (n.state !== "free") continue;
      const o = dist2d(n.x, n.y, e.x, e.y);
      o < s && ((s = o), (t = n));
    }
    (t != null || (t = this.teamPlayers(this.offense)[0]),
      (this.phase = "live"),
      (this.shotClock = 24),
      this.giveBall(t, !0),
      this.updateUser(!0));
  }
  tickStamina(e) {
    for (const s of this.players) s.stats.sec += e;
    if (!this.cfg.stamina) return;
    const t = 120 / this.cfg.quarterLen;
    for (const s of this.players) {
      const n = 0.0044 * (1.6 - s.stamina / 100) + (s.turboOn ? 0.0022 : 0);
      s.energy = Math.max(0, s.energy - n * t * e);
    }
    for (const s of this.bench) s.energy = Math.min(1, s.energy + 0.005 * t * e);
  }
  autoSubs(e, t) {
    if (!this.cfg.stamina) return;
    const s = () => this.bench.filter((r) => r.team === e && !r.hurt);
    if (!s().length) return;
    for (const r of this.teamPlayers(e).filter((i) => i.hurt && i !== this.ball.owner && i.state === "free")) {
      const i = s().sort(
        (l, c) =>
          (c.mon.pos === r.mon.pos ? 6 : 0) +
          c.mon.ovr -
          c.rotation * 2 -
          ((l.mon.pos === r.mon.pos ? 6 : 0) + l.mon.ovr - l.rotation * 2),
      )[0];
      i && this.swap(r, i);
    }
    if (e === 0 && this.teams[0].human && this.cfg.userAutoSubs === !1) return;
    const n = this.teamPlayers(e).sort((r, i) => r.energy - i.energy);
    let o = 0;
    for (const r of n) {
      if (o >= (t ? 5 : 2)) break;
      if (r === this.ball.owner || r.state !== "free") continue;
      const i = r.energy < (t ? 0.6 : 0.5);
      let l = null,
        c = -1 / 0;
      for (const h of s()) {
        const d = h.starter && !r.starter && h.energy >= 0.85;
        if (h.energy < 0.7 || !(i || d)) continue;
        const f = h.mon.ovr + (h.mon.pos === r.mon.pos ? 6 : 0) + h.energy * 10 + (d ? 8 : 0) - (h.rotation - 5) * 4;
        f > c && ((c = f), (l = h));
      }
      l && (this.swap(r, l), o++);
    }
  }
  requestSub(e, t) {
    return e.team !== t.team || !this.players.includes(e) || !this.bench.includes(t) || t.hurt
      ? !1
      : ((this.pendingSubs = this.pendingSubs.filter((s) => s.out !== e && s.in !== t)),
        this.pendingSubs.push({ out: e, in: t }),
        this.phase === "dead" || this.phase === "break" || this.phase === "tip"
          ? this.applyPendingSubs()
          : this.events.push({ kind: "subQueued", out: e, in: t }),
        !0);
  }
  cancelSub(e) {
    this.pendingSubs = this.pendingSubs.filter((t) => t.out !== e && t.in !== e);
  }
  applyPendingSubs() {
    for (const e of this.pendingSubs)
      this.players.includes(e.out) && this.bench.includes(e.in) && this.swap(e.out, e.in);
    this.pendingSubs = [];
  }
  swap(e, t) {
    (this.ball.owner === e && (this.ball.owner = t),
      (t.slot = e.slot),
      (t.x = e.x),
      (t.y = e.y),
      (t.z = 0),
      (t.vx = 0),
      (t.vy = 0),
      (t.vz = 0),
      (t.state = "free"),
      (t.dunk = null),
      (t.meter = 0),
      (t.facing = e.facing),
      (t.ai.jumpIn = -1),
      (t.ai.plan = "none"),
      (e.slot = -1),
      (e.state = "free"),
      (e.dunk = null),
      (e.z = 0),
      (e.vz = 0),
      e.fire && ((e.fire = !1), (e.streak = 0), this.events.push({ kind: "fire", player: e, on: !1 })),
      (this.players[this.players.indexOf(e)] = t),
      (this.bench[this.bench.indexOf(t)] = e),
      this.users[e.team] === e && ((this.users[e.team] = t), (e.human = !1), (t.human = !0)),
      this.assignMatchups(),
      this.events.push({ kind: "sub", out: e, in: t }));
  }
  act(e, t) {
    const s = e.intent,
      n = this.ball,
      o = n.owner === e && n.mode === "held";
    if (
      (s.special && e.special >= 1 && e.state !== "stun" && this.useSpecial(e),
      !(e.state === "stun" || e.state === "dunk" || e.state === "hang") &&
        !(
          this.clock <= 0 &&
          this.phase === "live" &&
          (e.state === "shoot" && ((e.state = "free"), (e.meter = 0)), e.state !== "layup")
        ))
    ) {
      if (e.state === "shoot") {
        if (!o) {
          e.state = "free";
          return;
        }
        ((e.meter += t / rn), (e.stateT += t));
        const r = e.human ? !s.shootHeld : e.meter >= e.releaseAt,
          i = e.z <= 0 && e.stateT > 0.15;
        (r || e.meter >= 1.25 || i) && this.releaseShot(e);
        return;
      }
      if (e.state === "layup") {
        ((e.stateT += t), o && e.stateT >= 0.24 && this.releaseLayup(e));
        return;
      }
      if (e.state === "swipe") {
        ((e.stateT -= t), e.stateT <= 0 && (e.state = "free"));
        return;
      }
      o
        ? s.shoot
          ? this.startShot(e)
          : s.pass && this.doPass(e)
        : (s.shoot && e.z === 0 && this.jump(e), s.steal && this.trySteal(e));
    }
  }
  jump(e) {
    e.vz = 14 + Math.max(e.r.blk, e.r.reb) * 0.05;
  }
  startShot(e) {
    const t = hoopXOf(e.team),
      s = this.distToHoop(e),
      n = e.intent.turbo && (e.turbo > 0.05 || e.fx.surge > 0 || e.fire);
    if (
      ((e.facing = t > e.x ? 1 : -1),
      !(this.drillId === "layups" || this.drillId === "jumpshots") && s <= this.dunkRange(e, n))
    ) {
      this.startDunk(e, !1);
      return;
    }
    if (s <= 7.5) {
      ((e.state = "layup"), (e.stateT = 0), (e.vz = 12));
      return;
    }
    if (((e.state = "shoot"), (e.stateT = 0), (e.meter = 0), (e.vz = 10.5), (e.vx *= 0.25), (e.vy *= 0.25), !e.human)) {
      const r = this.vsCpu && e.team === 1 && this.teams[0].human,
        i = Math.max(0.05, 0.09 + (100 - e.r.sht) * 0.0018 - (r ? this.diff.cpuShot - 0.06 * this.catchup() : 0));
      e.releaseAt = clampNum(rt + this.randn() * i, 0.3, 1.2);
    }
  }
  contest(e) {
    if (e.fx.phase > 0) return 1;
    const t = hoopXOf(e.team),
      s = Math.hypot(t - e.x, COURT_MID_Y - e.y) || 1;
    let n = 0;
    for (const o of this.players) {
      if (o.team === e.team || o.state === "stun") continue;
      const r = dist2d(e.x, e.y, o.x, o.y);
      if (r > 7) continue;
      let i = (1 - r / 7) * (0.25 + o.r.def * 0.0025 + o.size * 0.06) * (o.z > 0.8 ? 1.4 : 1);
      (((o.x - e.x) * (t - e.x) + (o.y - e.y) * (COURT_MID_Y - e.y)) / ((r || 1) * s) < 0.3 && (i *= 0.6), (n = Math.max(n, i)));
    }
    return (e.human && (n *= this.diff.contest), clampNum(1 - n, 0.35, 1));
  }
  baseProb(e, t, s) {
    return t < 8
      ? 0.55 + e.r.ins * 0.004
      : s
        ? clampNum(0.1 + e.r.sht * 0.0037 - Math.max(0, t - 24) * 0.03, 0.02, 0.6)
        : clampNum(0.2 + e.r.sht * 0.0042 - (t - 8) * 0.007, 0.1, 0.75);
  }
  releaseShot(e) {
    const t = e.meter - rt,
      s = this.greenWindow(e);
    let n;
    e.fx.lockin
      ? ((n = "perfect"), (e.fx.lockin = !1))
      : Math.abs(t) <= s
        ? (n = "perfect")
        : Math.abs(t) <= s * 2.3
          ? (n = "good")
          : Math.abs(t) <= s * 4.5
            ? (n = t < 0 ? "early" : "late")
            : (n = t < 0 ? "very-early" : "very-late");
    const o = this.distToHoop(e),
      r = isOutsideCourt(e.x, e.y, e.team),
      i = this.contest(e),
      l = this.baseProb(e, o, r);
    let c;
    switch (n) {
      case "perfect":
        c = (r ? 0.86 : 0.94) - (1 - i) * 0.55;
        break;
      case "good":
        c = l * i + 0.06;
        break;
      case "early":
      case "late":
        c = l * i * 0.8;
        break;
      default:
        c = l * i * 0.3;
    }
    ((c *= 0.7 + 0.3 * this.effort(e)),
      e.fire && (c = Math.min(0.97, c + 0.25)),
      o > 35 && (c = Math.min(c, n === "perfect" ? 0.25 : 0.04)));
    const h = this.rng() < c,
      d = !h && n.startsWith("very") && this.rng() < 0.4;
    (this.events.push({ kind: "release", player: e, grade: n }),
      this.launchShot(e, h, d, r ? 3 : 2, "jump"),
      (e.state = "free"),
      (e.meter = 0));
  }
  releaseLayup(e) {
    const t = this.contest(e);
    let s = (0.55 + e.r.ins * 0.004) * (0.45 + 0.55 * t) * (0.7 + 0.3 * this.effort(e));
    (e.fx.lockin && ((s = 0.97), (e.fx.lockin = !1)),
      e.fire && (s = Math.min(0.97, s + 0.2)),
      this.launchShot(e, this.rng() < s, !1, 2, "layup"),
      (e.state = "free"));
  }
  launchShot(e, t, s, n, o) {
    const r = this.ball,
      i = hoopXOf(e.team),
      l = e.x + e.facing * 0.3,
      c = e.y,
      h = e.z + e.heightFt + 0.4;
    let d = i,
      f = COURT_MID_Y,
      u = HOOP_OFFSET + 0.1;
    if (s) {
      const y = e.x - i,
        v = e.y - COURT_MID_Y,
        b = Math.hypot(y, v) || 1,
        k = this.rand(3, 6);
      ((d = i + (y / b) * k), (f = COURT_MID_Y + (v / b) * k + this.rand(-2, 2)), (u = 6.5));
    } else if (!t) {
      const y = this.rand(0, Math.PI * 2);
      ((d += Math.cos(y) * COURT_SCALE_W * 1.25), (f += Math.sin(y) * COURT_SCALE_W * 1.25));
    }
    const m = dist2d(l, c, d, f),
      p = o === "layup" ? 0.55 : 0.75 + m * 0.017;
    ((r.owner = null),
      (r.mode = "shot"),
      (r.pass = null),
      (r.fromShot = -1),
      (r.lastTouch = e.team),
      (r.shot = {
        shooter: e,
        make: t,
        airball: s,
        points: n,
        t: 0,
        T: p,
        x0: l,
        y0: c,
        z0: h,
        tx: d,
        ty: f,
        tz: u,
        vx: (d - l) / p,
        vy: (f - c) / p,
        vz: (u - h + 0.5 * HOOP_RING_DIAMETER * p * p) / p,
        tested: new Set(),
        kind: o,
      }),
      e.stats.fga++,
      n === 3 && e.stats.tpa++,
      this.sfx.push("shot"));
  }
  startDunk(e, t) {
    const s = hoopXOf(e.team),
      n = this.distToHoop(e),
      o = Math.atan2(e.y - COURT_MID_Y, e.x - s),
      r = this.contest(e);
    let i = clampNum(0.5 + e.r.ins * 0.0035 - (1 - r) * 0.6, 0.3, 0.93) * (0.7 + 0.3 * this.effort(e));
    ((e.fire || e.fx.lockin) && (i = 0.99),
      (e.fx.lockin = !1),
      (e.dunk = {
        x0: e.x,
        y0: e.y,
        z0: e.z,
        x1: s + Math.cos(o) * 1.2,
        y1: COURT_MID_Y + Math.sin(o) * 1.2,
        t: 0,
        T: clampNum(0.42 + n * 0.04, 0.45, 1),
        peak: 3 + n * 0.3,
        spin: n > 9 && this.rng() < 0.65,
        make: this.rng() < i,
        oop: t,
        tested: new Set(),
      }),
      (e.state = "dunk"),
      (e.vx = 0),
      (e.vy = 0),
      (e.vz = 0),
      (e.facing = s > e.x ? 1 : -1),
      e.stats.fga++);
  }
  updateDunk(e, t) {
    const s = e.dunk;
    s.t += t;
    const n = Math.min(1, s.t / s.T),
      o = HOOP_OFFSET + 0.5 - e.heightFt;
    if (
      ((e.x = lerpNum(s.x0, s.x1, n)),
      (e.y = lerpNum(s.y0, s.y1, n)),
      (e.z = Math.max(0, lerpNum(s.z0, o, Math.sqrt(n)) + 4 * n * (1 - n) * s.peak)),
      n > 0.25 && n < 0.97 && e.fx.phase <= 0)
    )
      for (const r of this.players) {
        if (
          r.team === e.team ||
          s.tested.has(r.id) ||
          r.z < 0.8 ||
          dist2d(e.x, e.y, r.x, r.y) > 3.6 ||
          r.z + r.heightFt + 1.6 < e.z + e.heightFt
        )
          continue;
        s.tested.add(r.id);
        const i = clampNum(0.25 + r.r.blk * 0.004 - e.r.ins * 0.0025 + (r.size - e.size) * 0.3, 0.08, 0.55);
        if (this.rng() < i) {
          ((e.dunk = null), (e.state = "free"), (e.vz = 0), this.recordBlock(r, e));
          return;
        }
      }
    if (n >= 1) {
      e.dunk = null;
      const r = e.team === 0 ? 1 : 0;
      if (((this.rimShake[r] = 1), s.make)) {
        ((e.state = "hang"), (e.stateT = 0.35));
        const i = this.ball;
        ((i.owner = null),
          (i.mode = "net"),
          (i.x = hoopXOf(e.team)),
          (i.y = COURT_MID_Y),
          (i.z = HOOP_OFFSET),
          (this.netT[r] = 0.5),
          (this.shake = 1),
          this.sfx.push("dunk"),
          this.scoreBasket(e, 2, "dunk"));
      } else {
        ((e.state = "free"), (e.vz = 0));
        const i = this.ball;
        ((i.owner = null), (i.mode = "loose"), (i.x = s.x1), (i.y = s.y1), (i.z = HOOP_OFFSET + 0.4));
        const l = Math.atan2(s.y0 - COURT_MID_Y, s.x0 - hoopXOf(e.team)) + this.rand(-1, 1);
        ((i.vx = Math.cos(l) * this.rand(6, 11)),
          (i.vy = Math.sin(l) * this.rand(6, 11)),
          (i.vz = this.rand(8, 13)),
          (i.fromShot = e.team),
          (i.noPickup = 0.25),
          this.sfx.push("rim"),
          this.events.push({ kind: "miss", player: e, airball: !1 }));
      }
    }
  }
  recordBlock(e, t) {
    const s = this.ball,
      n = Math.atan2(s.y - e.y, s.x - e.x) + this.rand(-0.6, 0.6);
    ((s.owner = null),
      (s.shot = null),
      (s.mode = "loose"),
      (s.vx = Math.cos(n) * this.rand(10, 18)),
      (s.vy = Math.sin(n) * this.rand(10, 18)),
      (s.vz = this.rand(2, 8)),
      (s.fromShot = t.team),
      (s.lastTouch = e.team),
      (s.noPickup = 0.2),
      e.stats.blk++,
      (e.special = Math.min(1, e.special + 0.35)),
      this.events.push({ kind: "block", player: e, victim: t }),
      this.sfx.push("block"));
  }
  pickPassTarget(e) {
    const t = this.teamPlayers(e.team).filter((l) => l !== e && l.state !== "stun");
    if (!t.length) return null;
    const { mx: s, my: n } = e.intent,
      o = Math.hypot(s, n);
    if (o > 0.3) {
      let l = null,
        c = 0.3;
      for (const h of t) {
        const d = dist2d(e.x, e.y, h.x, h.y) || 1,
          u = ((h.x - e.x) * s + (h.y - e.y) * n) / (d * o) - d * 0.004;
        u > c && ((c = u), (l = h));
      }
      if (l) return l;
    }
    let r = t[0],
      i = -1 / 0;
    for (const l of t) {
      const c = Math.min(this.openness(l), 10) + (40 - this.distToHoop(l)) * 0.1;
      c > i && ((i = c), (r = l));
    }
    return r;
  }
  doPass(e) {
    var o;
    const t = (o = e.intent.passTo) != null ? o : this.pickPassTarget(e);
    if (!t || t === e) return;
    const s = this.ball,
      n = e.intent.turbo && this.distToHoop(t) < 17 && t.state === "free";
    ((s.owner = null),
      (s.mode = "pass"),
      (s.lastTouch = e.team),
      (s.pass = {
        from: e,
        to: t,
        oop: n,
        t: 0,
        speed: n ? 32 : 46 + e.r.pas * 0.16,
        tested: new Set(),
        z0: s.z,
        dist0: Math.max(1, dist2d(s.x, s.y, t.x, t.y)),
      }),
      (t.ai.think = 0),
      this.sfx.push("pass"));
  }
  trySteal(e) {
    if (e.stealCd > 0 || e.z > 0.5) return;
    ((e.stealCd = 0.6), (e.state = "swipe"), (e.stateT = 0.25));
    const t = this.ball.mode === "held" ? this.ball.owner : null;
    if (e.intent.turbo && (e.turbo > 0.25 || e.fx.surge > 0 || e.fire)) {
      let o = null;
      if (t && t.team !== e.team && dist2d(e.x, e.y, t.x, t.y) < 4.8 && t.state !== "dunk") o = t;
      else {
        let h = 4.8;
        for (const d of this.players) {
          if (d.team === e.team || d.state === "stun" || d.state === "dunk") continue;
          const f = dist2d(e.x, e.y, d.x, d.y);
          f < h && ((h = f), (o = d));
        }
      }
      if (!o) return;
      e.fx.surge > 0 || e.fire || (e.turbo = Math.max(0, e.turbo - 0.35));
      const r = Va(e.mon.types, o.mon.types);
      let i = 0.55 + (e.size - o.size) * 0.8 + (e.r.def - o.r.hnd) / 250;
      ((i *= r === 0 ? 0 : r >= 2 ? 1.5 : r < 1 ? 0.6 : 1), o.fx.phase > 0 && (i = 0));
      const l = this.rng() < clampNum(i, 0, 0.95),
        c = dist2d(e.x, e.y, o.x, o.y) || 1;
      ((e.vx += ((o.x - e.x) / c) * 8),
        (e.vy += ((o.y - e.y) / c) * 8),
        l && this.knock(o, e, 1.1),
        this.events.push({ kind: "shove", player: e, victim: o, mult: r, ok: l }),
        this.sfx.push("shove"));
      return;
    }
    if (!t || t.team === e.team || t.state === "dunk" || dist2d(e.x, e.y, t.x, t.y) > 4.6) return;
    let n = clampNum(0.1 + (e.r.def - t.r.hnd) / 220, 0.03, 0.38);
    ((t.state === "shoot" || t.state === "layup") && (n *= 0.4),
      t.fx.phase > 0 && (n = 0),
      this.rng() < n &&
        ((t.state = "free"),
        (t.meter = 0),
        this.giveBall(e),
        e.stats.stl++,
        (e.special = Math.min(1, e.special + 0.3)),
        this.events.push({ kind: "steal", player: e, victim: t }),
        this.sfx.push("steal")));
  }
  maybeInjure(e, t) {
    if (!this.cfg.injuries || e.hurt || this.rng() >= t * (1 + (1 - e.energy) * 2)) return;
    const s = this.rng();
    ((e.hurt = s < 0.6 ? 1 : s < 0.9 ? 2 : 3),
      (e.energy = Math.min(e.energy, 0.15)),
      this.events.push({ kind: "injury", player: e, weeks: e.hurt }),
      this.sfx.push("whistle"));
  }
  knock(e, t, s) {
    this.maybeInjure(e, 0.012);
    const n = dist2d(e.x, e.y, t.x, t.y) || 1,
      o = (e.x - t.x) / n,
      r = (e.y - t.y) / n;
    ((e.state = "stun"), (e.stateT = s), (e.meter = 0), (e.dunk = null), (e.vx = o * 14), (e.vy = r * 14), (e.vz = 5));
    const i = this.ball;
    i.owner === e &&
      ((i.owner = null),
      (i.mode = "loose"),
      (i.vx = o * 8 + this.rand(-3, 3)),
      (i.vy = r * 8 + this.rand(-3, 3)),
      (i.vz = 7),
      (i.noPickup = 0.25),
      (i.fromShot = -1));
  }
  setFire(e) {
    e.fire ||
      this.drillId ||
      ((e.fire = !0), (e.fireMakes = 0), this.events.push({ kind: "fire", player: e, on: !0 }), this.sfx.push("fire"));
  }
  useSpecial(e) {
    e.special = 0;
    const t = [],
      s = e.mon.types[0];
    switch (e.mon.special) {
      case "surge":
        ((e.fx.surge = 5), (e.turbo = 1));
        break;
      case "lockin":
        e.fx.lockin = !0;
        break;
      case "phase":
        e.fx.phase = 5;
        break;
      case "blaze":
        this.setFire(e);
        break;
      case "quake":
        this.shake = 1.2;
        for (const n of this.opponents(e.team)) {
          if (dist2d(e.x, e.y, n.x, n.y) > 14) continue;
          const o = n.fx.phase > 0 ? 0 : Xt(s, n.mon.types);
          (t.push({ victim: n, mult: o }), o > 0 && n.state !== "dunk" && this.knock(n, e, 0.6 + 0.35 * o));
        }
        break;
      case "freeze":
        for (const n of this.opponents(e.team)) {
          const o = Xt(s, n.mon.types);
          (t.push({ victim: n, mult: o }), o > 0 && (n.fx.slow = 3 + 1.5 * o));
        }
        break;
    }
    (this.events.push({ kind: "special", player: e, hits: t }), this.sfx.push("special"));
  }
  scoreBasket(e, t, s) {
    ((this.score[e.team] += t),
      (e.stats.pts += t),
      e.stats.fgm++,
      t === 3 && e.stats.tpm++,
      s === "dunk" && e.stats.dnk++);
    const n = e.lastPasser;
    (n &&
      n.team === e.team &&
      this.time - e.lastCatch < 4 &&
      (n.stats.ast++, (n.special = Math.min(1, n.special + 0.12))),
      (e.lastPasser = null),
      (e.special = Math.min(1, e.special + 0.3)));
    for (const o of this.opponents(e.team))
      ((o.streak = 0), o.fire && ((o.fire = !1), this.events.push({ kind: "fire", player: o, on: !1 })));
    (e.streak++,
      e.fire
        ? (e.fireMakes++, e.fireMakes >= 5 && ((e.fire = !1), this.events.push({ kind: "fire", player: e, on: !1 })))
        : e.streak >= 3
          ? this.setFire(e)
          : e.streak === 2 && this.events.push({ kind: "heating", player: e }),
      this.events.push({ kind: "score", player: e, points: t, how: s }),
      this.clock <= 0 &&
        (this.events.push({ kind: "buzzerbeater", player: e, points: t }),
        this.sfx.push("fire"),
        (this.celebrateT = 1.8)),
      (this.phase = "dead"),
      (this.phaseT = 1.1),
      this.setOffense(1 - e.team));
  }
  movePlayer(e, t) {
    if (
      ((e.stealCd = Math.max(0, e.stealCd - t)),
      (e.fx.surge = Math.max(0, e.fx.surge - t)),
      (e.fx.phase = Math.max(0, e.fx.phase - t)),
      (e.fx.slow = Math.max(0, e.fx.slow - t)),
      e.state === "dunk")
    ) {
      this.updateDunk(e, t);
      return;
    }
    if (e.state === "hang") {
      ((e.stateT -= t), e.stateT <= 0 && ((e.state = "free"), (e.vz = 0), this.maybeInjure(e, 0.003)));
      return;
    }
    let s = 0,
      n = 0;
    if (((e.turboOn = !1), e.state === "stun")) ((e.stateT -= t), e.stateT <= 0 && e.z <= 0 && (e.state = "free"));
    else if (e.state === "layup") {
      const o = hoopXOf(e.team),
        r = this.distToHoop(e) || 1;
      ((s = ((o - e.x) / r) * 9), (n = ((COURT_MID_Y - e.y) / r) * 9));
    } else if (e.state === "free" || e.state === "swipe") {
      const o = e.intent;
      let r = o.mx,
        i = o.my;
      const l = Math.hypot(r, i);
      l > 1 && ((r /= l), (i /= l));
      const c = e.fx.surge > 0 || e.fire,
        h = o.turbo && l > 0.1 && (e.turbo > 0.02 || c);
      let d = (11 + e.r.spd * 0.085) * this.effort(e);
      (h && (d *= 1.42),
        e.fx.surge > 0 && (d *= 1.2),
        e.fx.slow > 0 && (d *= 0.55),
        this.ball.owner === e && (d *= 0.94),
        e.state === "swipe" && (d *= 0.5),
        this.phase === "tip" && (d = 0),
        (s = r * d),
        (n = i * d),
        h && ((e.turboOn = !0), c || (e.turbo = Math.max(0, e.turbo - 0.38 * t))));
    }
    if ((e.turboOn || (e.turbo = Math.min(1, e.turbo + 0.16 * t)), e.state === "stun")) {
      const o = Math.min(1, 3 * t);
      ((e.vx -= e.vx * o), (e.vy -= e.vy * o));
    } else {
      const o = Math.min(1, (e.z > 0.05 ? 2 : 11) * t);
      ((e.vx += (s - e.vx) * o), (e.vy += (n - e.vy) * o));
    }
    ((e.x += e.vx * t),
      (e.y += e.vy * t),
      (e.z > 0 || e.vz > 0) && ((e.vz -= HOOP_RING_DIAMETER * t), (e.z += e.vz * t), e.z <= 0 && ((e.z = 0), (e.vz = 0))),
      (e.x = clampNum(e.x, 0.6, COURT_HALF_WIDTH - 0.6)),
      (e.y = clampNum(e.y, 0.6, COURT_MID_X - 0.6)),
      e.state === "shoot" || e.state === "layup"
        ? ((e.facing = hoopXOf(e.team) > e.x ? 1 : -1), (e.back = !1))
        : e.state !== "stun" &&
          (Math.abs(e.vx) > 1.5 && (e.facing = e.vx > 0 ? 1 : -1),
          (e.back = e.vy < -3 && Math.abs(e.vy) > Math.abs(e.vx) * 0.9)),
      (e.runPhase += Math.hypot(e.vx, e.vy) * t * 0.9));
  }
  separate() {
    const e = this.players;
    for (let t = 0; t < e.length; t++) {
      const s = e[t];
      if (!(s.state === "dunk" || s.state === "hang" || s.fx.phase > 0))
        for (let n = t + 1; n < e.length; n++) {
          const o = e[n];
          if (o.state === "dunk" || o.state === "hang" || o.fx.phase > 0 || Math.abs(s.z - o.z) > 3) continue;
          const r = 1.1 * (s.size + o.size);
          let i = o.x - s.x,
            l = o.y - s.y,
            c = Math.hypot(i, l);
          if (c >= r) continue;
          c < 0.001 && ((i = this.rand(-1, 1)), (l = this.rand(-1, 1)), (c = Math.hypot(i, l) || 1));
          const h = (r - c) / 2;
          ((s.x -= (i / c) * h), (s.y -= (l / c) * h), (o.x += (i / c) * h), (o.y += (l / c) * h));
        }
    }
  }
  updateBall(e) {
    const t = this.ball;
    switch (((t.noPickup = Math.max(0, t.noPickup - e)), (t.spin += e * (t.mode === "held" ? 4 : 10)), t.mode)) {
      case "held":
        this.ballInHands(t.owner);
        break;
      case "pass":
        this.updatePass(e);
        break;
      case "shot":
        this.updateShot(e);
        break;
      case "net":
        ((t.z -= 9 * e),
          t.z <= 6.8 &&
            ((t.mode = "loose"),
            (t.vx = this.rand(-1.5, 1.5)),
            (t.vy = this.rand(-1.5, 1.5)),
            (t.vz = -4),
            (t.fromShot = -1)));
        break;
      case "loose":
        (this.ballPhysics(e), this.phase === "live" && t.noPickup <= 0 && this.loosePickup());
        break;
    }
  }
  ballInHands(e) {
    const t = this.ball;
    if (e.state === "shoot" || e.state === "layup" || e.state === "dunk" || e.state === "hang") {
      ((t.x = e.x + e.facing * 0.4), (t.y = e.y + 0.2), (t.z = e.z + e.heightFt + 0.4));
      return;
    }
    const n = Math.hypot(e.vx, e.vy) > 3 ? 0.36 : 0.5,
      o = (this.time % n) / n;
    (this.dribblePh < 0.5 && o >= 0.5 && this.phase !== "tip" && this.sfx.push("dribble"),
      (this.dribblePh = o),
      (t.x = e.x + e.facing * 0.9 * e.size),
      (t.y = e.y + 0.5),
      (t.z = e.z + COURT_SCALE_H + Math.abs(Math.cos(o * Math.PI)) * 2.2 * e.size));
  }
  updatePass(e) {
    const t = this.ball,
      s = t.pass;
    s.t += e;
    const n = s.to,
      o = n.x + n.facing * 0.6,
      r = n.y + 0.4,
      i = s.oop ? Math.max(n.z + n.heightFt + 1, 9) : n.z + n.heightFt * 0.6,
      l = o - t.x,
      c = r - t.y,
      h = Math.hypot(l, c),
      d = s.speed * e,
      f = clampNum(1 - h / s.dist0, 0, 1);
    t.z = lerpNum(s.z0, i, f) + Math.sin(f * Math.PI) * (s.oop ? 6 : 1.2);
    for (const u of this.players) {
      if (
        u.team === s.from.team ||
        s.tested.has(u.id) ||
        u.state === "stun" ||
        dist2d(u.x, u.y, t.x, t.y) > 2 ||
        t.z > u.z + u.heightFt + 1.6
      )
        continue;
      s.tested.add(u.id);
      let m = clampNum(0.08 + (u.r.def - s.from.r.pas) / 200 + (u.human && u.intent.steal ? 0.2 : 0), 0.03, 0.4);
      if ((s.oop && u.z < 1 && (m *= 0.2), this.rng() < m)) {
        (this.giveBall(u),
          u.stats.stl++,
          (u.special = Math.min(1, u.special + 0.3)),
          this.events.push({ kind: "steal", player: u, victim: s.from }),
          this.sfx.push("steal"));
        return;
      }
    }
    if (h <= Math.max(d, 1.5)) {
      ((t.x = o),
        (t.y = r),
        this.giveBall(n),
        (n.lastPasser = s.from),
        s.oop &&
          n.team === this.offense &&
          this.distToHoop(n) < 18 &&
          n.state === "free" &&
          (this.events.push({ kind: "oop", player: n }), this.startDunk(n, !0)));
      return;
    }
    ((t.x += (l / h) * d),
      (t.y += (c / h) * d),
      (s.t > 2.5 || n.state === "stun") &&
        ((t.mode = "loose"),
        (t.vx = (l / h) * s.speed * 0.5),
        (t.vy = (c / h) * s.speed * 0.5),
        (t.vz = 0),
        (t.pass = null),
        (t.fromShot = -1)));
  }
  updateShot(e) {
    const t = this.ball,
      s = t.shot;
    s.t += e;
    const n = Math.min(s.t, s.T);
    if (
      ((t.x = s.x0 + s.vx * n),
      (t.y = s.y0 + s.vy * n),
      (t.z = s.z0 + s.vz * n - 0.5 * HOOP_RING_DIAMETER * n * n),
      n < s.T * 0.45 && s.shooter.fx.phase <= 0)
    )
      for (const r of this.players) {
        if (
          r.team === s.shooter.team ||
          s.tested.has(r.id) ||
          r.z < 0.8 ||
          dist2d(r.x, r.y, t.x, t.y) > 3.2 ||
          r.z + r.heightFt + 1.4 < t.z - 0.5
        )
          continue;
        s.tested.add(r.id);
        const i = clampNum(0.15 + r.r.blk * 0.004 - s.shooter.r.sht * 0.002 - (s.kind === "layup" ? 0 : 0.05), 0.05, 0.6);
        if (this.rng() < i) {
          this.recordBlock(r, s.shooter);
          return;
        }
      }
    if (s.t < s.T) return;
    const o = s.shooter.team === 0 ? 1 : 0;
    if (((t.shot = null), s.airball))
      ((t.mode = "loose"),
        (t.vx = s.vx),
        (t.vy = s.vy),
        (t.vz = s.vz - HOOP_RING_DIAMETER * s.T),
        (t.fromShot = s.shooter.team),
        this.events.push({ kind: "miss", player: s.shooter, airball: !0 }));
    else if (s.make)
      ((t.mode = "net"),
        (t.x = hoopXOf(s.shooter.team)),
        (t.y = COURT_MID_Y),
        (t.z = HOOP_OFFSET),
        (this.netT[o] = 0.5),
        this.sfx.push("swish"),
        this.scoreBasket(s.shooter, s.points, s.kind));
    else {
      t.mode = "loose";
      const r = hoopXOf(s.shooter.team),
        i = Math.atan2(s.y0 - COURT_MID_Y, s.x0 - r) + this.rand(-1.3, 1.3),
        l = this.rand(5, 12);
      ((t.vx = Math.cos(i) * l),
        (t.vy = Math.sin(i) * l),
        (t.vz = this.rand(7, 13)),
        (t.fromShot = s.shooter.team),
        (t.noPickup = 0.25),
        (this.rimShake[o] = 0.6),
        this.sfx.push("rim"),
        this.events.push({ kind: "miss", player: s.shooter, airball: !1 }));
    }
  }
  ballPhysics(e) {
    const t = this.ball;
    if (
      ((t.vz -= HOOP_RING_DIAMETER * e),
      (t.x += t.vx * e),
      (t.y += t.vy * e),
      (t.z += t.vz * e),
      t.z < COURT_SCALE_H &&
        ((t.z = COURT_SCALE_H),
        t.vz < -2.5
          ? (t.vz < -5 && this.sfx.push("bounce"), (t.vz = -t.vz * 0.6), (t.vx *= 0.88), (t.vy *= 0.88))
          : (t.vz = 0)),
      t.z <= COURT_SCALE_H + 0.01)
    ) {
      const s = Math.min(1, 1.5 * e);
      ((t.vx -= t.vx * s), (t.vy -= t.vy * s));
    }
    (t.x < 0.5 && ((t.x = 0.5), (t.vx = Math.abs(t.vx) * 0.5)),
      t.x > COURT_HALF_WIDTH - 0.5 && ((t.x = COURT_HALF_WIDTH - 0.5), (t.vx = -Math.abs(t.vx) * 0.5)),
      t.y < 0.5 && ((t.y = 0.5), (t.vy = Math.abs(t.vy) * 0.5)),
      t.y > COURT_MID_X - 0.5 && ((t.y = COURT_MID_X - 0.5), (t.vy = -Math.abs(t.vy) * 0.5)));
  }
  loosePickup() {
    const e = this.ball;
    let t = null,
      s = -1 / 0;
    for (const r of this.players) {
      if (
        r.state === "stun" ||
        r.state === "dunk" ||
        r.state === "hang" ||
        dist2d(r.x, r.y, e.x, e.y) > 1.4 + r.size * 0.6 ||
        e.z > r.z + r.heightFt + 1.6
      )
        continue;
      const i = r.r.reb + this.rng() * 35 + (r.z > 0.5 ? 10 : 0);
      i > s && ((s = i), (t = r));
    }
    if (!t) return;
    const n = e.fromShot;
    (n !== -1 && (t.stats.reb++, (t.special = Math.min(1, t.special + 0.1))), (e.fromShot = -1));
    const o = n !== -1 && t.team === n;
    (this.giveBall(t), o ? (this.shotClock = Math.max(this.shotClock, 14)) : n !== -1 && (this.shotClock = 24));
  }
  focusX() {
    const e = this.ball;
    return e.owner ? e.owner.x - sideSign(e.owner.team) * 8 : e.x;
  }
}
const hn = ["#f4f1e8", "#2a2f55", "#ffcb05", "#e3350d"],
  ds = {
    "Pallet Town": {
      venue: "Pallet Town Gym",
      wood: "#d99a5b",
      paint: "#3b6fd8",
      apron: "#16224a",
      lines: "#faf7ee",
      logo: "pokeball",
      floorText: "PALLET TOWN",
      board: "WELCOME TO PALLET TOWN ★ PROF. OAK'S LAB ★ WHERE IT ALL BEGINS",
      boardColor: "#7aa2ff",
      crowd: ["#3b6fd8", "#3b6fd8", "#f4f1e8", "#e3350d", "#ffcb05"],
    },
    "Pewter Boulders": {
      venue: "Pewter City Gym",
      wood: "#b9a789",
      paint: "#7d6e55",
      apron: "#2e271b",
      lines: "#f2ece0",
      logo: "Boulder",
      floorText: "PEWTER CITY",
      board: "PEWTER CITY ★ PEWTER MUSEUM OF SCIENCE ★ ROCK SOLID DEFENSE",
      boardColor: "#d8c9a8",
      crowd: ["#a38c63", "#8d939c", "#5a4d38", "#f4f1e8"],
    },
    "Cerulean Cascades": {
      venue: "Cerulean City Gym",
      wood: "#86c6dc",
      paint: "#1f7fa8",
      apron: "#0b2c38",
      lines: "#ffffff",
      logo: "Cascade",
      floorText: "CERULEAN CITY",
      board: "CERULEAN CITY ★ CERULEAN CAPE ★ MAKE A SPLASH",
      boardColor: "#7fe0ff",
      crowd: ["#2bb3d6", "#3fa9f5", "#ffffff", "#f2668b"],
    },
    "Vermilion Thunder": {
      venue: "Vermilion City Gym",
      wood: "#e2aa5c",
      paint: "#2b2b2b",
      apron: "#3a2f06",
      lines: "#f6d23a",
      logo: "Thunder",
      floorText: "VERMILION CITY",
      board: "VERMILION CITY ★ S.S. ANNE ★ SHOCK THE CROWD",
      boardColor: "#f6d23a",
      crowd: ["#f2c522", "#2b2b2b", "#f2c522", "#f6a623"],
    },
    "Celadon Rainbows": {
      venue: "Celadon City Gym",
      wood: "#d8b27b",
      paint: "#4f9e4f",
      apron: "#13301a",
      lines: "#fbf6e8",
      logo: "Rainbow",
      floorText: "CELADON CITY",
      board: "CELADON CITY ★ CELADON DEPT. STORE ★ IN FULL BLOOM",
      boardColor: "#9be37b",
      crowd: ["#5cb85c", "#e8483c", "#f5c518", "#3b82f6"],
    },
    "Fuchsia Ninjas": {
      venue: "Fuchsia City Gym",
      wood: "#a98a9c",
      paint: "#7d2d8e",
      apron: "#2d1236",
      lines: "#f6ecf7",
      logo: "Soul",
      floorText: "FUCHSIA CITY",
      board: "FUCHSIA CITY ★ SAFARI ZONE ★ NINJA DEFENSE",
      boardColor: "#e59bf2",
      crowd: ["#b04fc4", "#ec5fa1", "#2d1236", "#f4f1e8"],
    },
    "Saffron Psychics": {
      venue: "Saffron City Gym",
      wood: "#e4b583",
      paint: "#d94f78",
      apron: "#3a1220",
      lines: "#fff4f7",
      logo: "Marsh",
      floorText: "SAFFRON CITY",
      board: "SAFFRON CITY ★ SILPH CO. ★ MIND GAMES",
      boardColor: "#ff9ab8",
      crowd: ["#f2668b", "#e2b93b", "#f4f1e8", "#a33ea1"],
    },
    "Cinnabar Volcanoes": {
      venue: "Cinnabar Island Gym",
      wood: "#8c4c33",
      paint: "#d4421c",
      apron: "#3d160b",
      lines: "#ffd2a8",
      logo: "Volcano",
      floorText: "CINNABAR ISLAND",
      board: "CINNABAR ISLAND ★ POKéMON LAB ★ FEEL THE HEAT",
      boardColor: "#ff8a4a",
      crowd: ["#e8622c", "#e2452b", "#ffb347", "#2b2b2b"],
    },
    "Viridian Quakes": {
      venue: "Viridian City Gym",
      wood: "#b79c69",
      paint: "#55702a",
      apron: "#1e2a0e",
      lines: "#f4f0dc",
      logo: "Earth",
      floorText: "VIRIDIAN CITY",
      board: "VIRIDIAN CITY ★ VIRIDIAN FOREST ★ THE EARTH SHAKES",
      boardColor: "#a8d46a",
      crowd: ["#7c9a3a", "#4fae4a", "#2b2b2b", "#e3350d"],
    },
    "Indigo Elite": {
      venue: "Indigo Plateau",
      wood: "#2c2650",
      paint: "#4a3c8c",
      apron: "#120f24",
      lines: "#e8c55a",
      logo: "Elite",
      floorText: "INDIGO PLATEAU",
      board: "INDIGO PLATEAU ★ POKéMON LEAGUE ★ FACE THE ELITE FOUR",
      boardColor: "#e8c55a",
      crowd: ["#d4a017", "#4a3c8c", "#f4f1e8", "#d4a017"],
    },
  };
function un(a) {
  const e = a.toUpperCase();
  return {
    ...ds["Pallet Town"],
    venue: "".concat(a, " Arena"),
    floorText: e,
    board: "HOME OF THE ".concat(e, " ★ PALLET TOWN ★ WHERE IT ALL BEGINS"),
  };
}
function ms(a) {
  var e;
  return (e = ds[a.name]) != null
    ? e
    : {
        venue: "".concat(a.name, " Arena"),
        wood: "#d99a5b",
        paint: a.color,
        apron: a.color2,
        lines: "#faf7ee",
        logo: "pokeball",
        floorText: a.name.toUpperCase(),
        board: "".concat(a.name.toUpperCase(), " ★ POKé JAM ★ SILPH CO. ★ POKé MART"),
        boardColor: "#ffcb05",
        crowd: [a.color, a.color, ...hn],
      };
}
let saveKeyRoute = (function () {
  try {
    var __pl = localStorage.getItem("pokejam.line");
    return __pl === "campaign"
      ? "pokejam.campaign.v1"
      : __pl === "journey"
        ? "pokejam.journey.v1"
        : "pokejam.franchise.v1";
  } catch (__le) {
    return "pokejam.franchise.v1";
  }
})();
window.__pjLine = saveKeyRoute === "pokejam.campaign.v1" ? "campaign" : saveKeyRoute === "pokejam.journey.v1" ? "journey" : "endless";
window.__pjSetLine = function (l) {
  try {
    localStorage.setItem("pokejam.line", l);
  } catch (__le2) {}
  saveKeyRoute = l === "campaign" ? "pokejam.campaign.v1" : l === "journey" ? "pokejam.journey.v1" : "pokejam.franchise.v1";
  window.__pjLine = l;
  return saveKeyRoute;
};
window.__pjSaveKey = function () {
  return saveKeyRoute;
};
window.__pjEnterLine = function (l) {
  window.__pjSetLine(l);
  location.reload();
};
const xpToNext = (a) => 60 + 25 * (a - 1),
  LEAGUE_GYMS = [
    {
      name: "Pewter Boulders",
      abbr: "PEW",
      color: "#a38c63",
      color2: "#2e271b",
      leader: "Brock",
      types: ["Rock"],
      boost: -3,
      gym: 1,
      badge: "Boulder",
    },
    {
      name: "Cerulean Cascades",
      abbr: "CER",
      color: "#2bb3d6",
      color2: "#0b2c38",
      leader: "Misty",
      types: ["Water"],
      boost: -2,
      gym: 2,
      badge: "Cascade",
    },
    {
      name: "Vermilion Thunder",
      abbr: "VER",
      color: "#f2c522",
      color2: "#3a2f06",
      leader: "EVOLUTIONS. Surge",
      types: ["Electric"],
      boost: -1,
      gym: 3,
      badge: "Thunder",
    },
    {
      name: "Celadon Rainbows",
      abbr: "CEL",
      color: "#5cb85c",
      color2: "#13301a",
      leader: "Erika",
      types: ["Grass"],
      boost: 0,
      gym: 4,
      badge: "Rainbow",
    },
    {
      name: "Fuchsia Ninjas",
      abbr: "FCH",
      color: "#b04fc4",
      color2: "#2d1236",
      leader: "Koga",
      types: ["Poison"],
      boost: 1,
      gym: 5,
      badge: "Soul",
    },
    {
      name: "Saffron Psychics",
      abbr: "SAF",
      color: "#f2668b",
      color2: "#3a1220",
      leader: "Sabrina",
      types: ["Psychic"],
      boost: 2,
      gym: 6,
      badge: "Marsh",
    },
    {
      name: "Cinnabar Volcanoes",
      abbr: "CIN",
      color: "#e8622c",
      color2: "#3d160b",
      leader: "Blaine",
      types: ["Fire"],
      boost: 2,
      gym: 7,
      badge: "Volcano",
    },
    {
      name: "Viridian Quakes",
      abbr: "VIR",
      color: "#7c9a3a",
      color2: "#1e2a0e",
      leader: "Giovanni",
      types: ["Ground"],
      boost: 3,
      gym: 8,
      badge: "Earth",
    },
    {
      name: "Indigo Elite",
      abbr: "E4",
      color: "#d4a017",
      color2: "#2a2106",
      leader: "The Elite Four",
      types: ["Ice", "Fighting", "Ghost", "Dragon"],
      boost: 4,
      elite: !0,
    },
  ],
  As = { color: "#3b6fd8", color2: "#16224a" },
  makeEmptyStats = () => ({ gp: 0, pts: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, reb: 0, ast: 0, stl: 0, blk: 0, dnk: 0, sec: 0, gs: 0 }),
  buildTeamPlayerView = (a, e) => {
    const t = a.players[e];
    return buildPlayer(t.dex, t.bonus);
  };
function pickHealthyStarters(a, e) {
  const t = (c) => {
    var h;
    return ((h = a.players[c].injury) != null ? h : 0) > 0;
  };
  let s = e.roster.filter(t);
  e.roster.length - s.length < 5 && (s = []);
  const n = e.roster.filter((c) => !s.includes(c)),
    o = e.lineup;
  if (o && e.roster.length > 5 && o.length === e.roster.length && e.roster.every((c) => o.includes(c))) {
    const c = o.filter((h) => !s.includes(h));
    return { starters: c.slice(0, 5), bench: c.slice(5), out: s };
  }
  const r = new Map(n.map((c) => [buildTeamPlayerView(a, c), c])),
    { starters: i, bench: l } = ye([...r.keys()]);
  return { starters: i.map((c) => r.get(c)), bench: l.map((c) => r.get(c)), out: s };
}
function Lr(a, e, t) {
  const s = a.teams[0],
    { starters: n, bench: o, out: r } = pickHealthyStarters(a, s),
    i = s.lineup && s.lineup.length === s.roster.length ? [...s.lineup] : [...n, ...o, ...r],
    l = i.indexOf(e),
    c = i.indexOf(t);
  l < 0 || c < 0 || (([i[l], i[c]] = [i[c], i[l]]), (s.lineup = i));
}
function Ir(a) {
  delete a.teams[0].lineup;
}
const Or = (a, e) => {
  const { starters: t } = pickHealthyStarters(a, e);
  return Math.round(t.reduce((s, n) => s + buildTeamPlayerView(a, n).ovr, 0) / t.length);
};
function Rr(a) {
  const e = Math.max(1, a.gp);
  return { ppg: a.pts / e, rpg: a.reb / e, apg: a.ast / e, spg: a.stl / e, bpg: a.blk / e };
}
const ts = (a) => a.pts + a.reb * 1.2 + a.ast * 1.5 + a.stl * 2 + a.blk * 2 - (a.fga - a.fgm) * 0.4;
function ya(a, e) {
  const t = [...Array(a).keys()],
    s = [];
  for (let o = 0; o < a - 1; o++) {
    const r = [];
    for (let i = 0; i < a / 2; i++) {
      const l = t[i],
        c = t[a - 1 - i];
      r.push(o % 2 ? [c, l] : [l, c]);
    }
    (s.push(r), t.splice(1, 0, t.pop()));
  }
  if (!e) {
    const o = (r) => {
      var i;
      return (i = r.flat().find((l, c, h) => h[c ^ 1] === 0 && l !== 0)) != null ? i : 0;
    };
    s.sort((r, i) => o(r) - o(i));
  }
  const n = [];
  return (
    s.forEach((o, r) => o.forEach(([i, l]) => n.push({ week: r + 1, home: i, away: l, score: null }))),
    e && s.forEach((o, r) => o.forEach(([i, l]) => n.push({ week: r + a, home: l, away: i, score: null }))),
    n
  );
}
function Dr(a, e, t) {
  const s = {};
  let n = 0;
  const o = (r) => {
    const i = "p".concat(n++);
    return ((s[i] = { uid: i, dex: r.dex, level: 1, xp: 0, bonus: {}, stats: makeEmptyStats(), ovrStart: r.ovr }), i);
  };
  return {
    version: 1,
    season: 1,
    week: 1,
    phase: "season",
    teams: a.map((r, i) => ({ id: i, ...r, roster: e[i].map(o), w: 0, l: 0, pf: 0, makeEmptyStats: 0, streak: 0 })),
    players: s,
    freeAgents: t.map(o),
    weeks: a.length - 1,
    games: window.__PJ_STORY_SCHEDULE__ ? window.__PJ_STORY_SCHEDULE__(a, ya) : ya(a.length, !1),
    signedWeek: 0,
    news: [],
    history: [],
    campaign: window.__pjLine === "campaign",
  };
}
function Nr(a) {
  try {
    window.__pjLeagueRef = a;
  } catch (__lr) {}
  try {
    localStorage.setItem(saveKeyRoute, JSON.stringify(a));
  } catch {}
}
window.__pjJourneyLeague = function () {
  try {
    var a = window.__pjLeagueRef;
    return a && a.journey ? a : null;
  } catch (e) {
    return null;
  }
};
window.__pjJourneySave = function () {
  try {
    var a = window.__pjJourneyLeague();
    a && Nr(a);
  } catch (e) {}
};
window.__pjMonData = function (dex) {
  try {
    var e = getPokemon(dex),
      s = HEIGHT_WEIGHT[dex] || null;
    return {
      r: e.r,
      types: e.types,
      archetype: e.archetype,
      special: e.special,
      move: e.move,
      size: e.size,
      hw: s ? { h: s[0], w: s[1] } : null,
      pos: e.pos,
    };
  } catch (e) {
    return null;
  }
};
window.__pjEvoOf = function (dex) {
  try {
    return EVOLUTIONS[dex] || null;
  } catch (e) {
    return null;
  }
};
window.__pjJourneyRecruit = function (__dx, __src) {
  try {
    var a = window.__pjJourneyLeague();
    if (!a) return { ok: 0, err: "no-league" };
    var __me = 0;
    for (var __i = 0; __i < a.teams.length; __i++) {
      if (!a.teams[__i].gym && !a.teams[__i].elite) {
        __me = __i;
        break;
      }
    }
    var __tm = a.teams[__me];
    a.box || (a.box = []);
    a.dex || (a.dex = {});
    a.coins || (a.coins = 0);
    var __mine = __tm.roster.concat(a.box);
    for (var __k = 0; __k < __mine.length; __k++) {
      var __pp = a.players[__mine[__k]];
      if (__pp && __pp.dex === __dx) return { ok: 0, err: "dup", dex: __dx };
    }
    var __ent = null;
    POKEMON_LIST.forEach(function (p) {
      if (!__ent && p.dex === __dx) __ent = p;
    });
    if (!__ent) return { ok: 0, err: "bad-dex" };
    var __n = 0;
    for (var __kk in a.players) {
      var __mm = /^p(\d+)$/.exec(__kk);
      if (__mm) __n = Math.max(__n, +__mm[1]);
    }
    var __uid = "p" + (__n + 1);
    a.players[__uid] = { uid: __uid, dex: __dx, level: 1, xp: 0, bonus: {}, stats: makeEmptyStats(), ovrStart: __ent.ovr };
    var __placed = "roster";
    if (__tm.roster.length >= 10) {
      a.box.push(__uid);
      __placed = "box";
    } else __tm.roster.push(__uid);
    var __first = !a.dex[__dx];
    a.dex[__dx] = 1;
    if (__first) {
      a.coins += 50;
      try {
        a.news.unshift("NEW POKéDEX ENTRY: ".concat(getPokemon(__dx).name, " (+50 coins)"));
      } catch (__ne) {}
    }
    if (__src)
      try {
        a.news.unshift("SIGNED (".concat(__src, "): ").concat(getPokemon(__dx).name));
      } catch (__ne2) {}
    try {
      a.news = a.news.slice(0, 8);
    } catch (__ne3) {}
    Nr(a);
    return { ok: 1, uid: __uid, placed: __placed, first: __first };
  } catch (__je) {
    return { ok: 0, err: String((__je && __je.message) || __je) };
  }
};
window.__pjJourneyNew = function (__sd, __nm, __ab) {
  try {
    if (window.__pjLine !== "journey") return { ok: 0, err: "not-journey" };
    var __ent = null;
    POKEMON_LIST.forEach(function (p) {
      if (!__ent && p.dex === __sd) __ent = p;
    });
    if (!__ent) return { ok: 0, err: "bad-dex" };
    var __teams = [
      { name: __nm || "Pallet Town", abbr: __ab || "PT", human: !0, ...As },
      ...LEAGUE_GYMS.map(function (l) {
        return { ...l, human: !1 };
      }),
    ];
    var __gen = li(__teams, 10, [__ent]);
    var __lg = Dr(__teams, __gen.rosters, __gen.leftovers);
    __lg.journey = !0;
    __lg.coins = 300;
    __lg.eggs = [];
    __lg.shop = null;
    __lg.box = [];
    __lg.dex = {};
    __lg.dex[__sd] = 1;
    __lg.coins = (__lg.coins || 0) + 50;
    Nr(__lg);
    return { ok: 1 };
  } catch (__je2) {
    return { ok: 0, err: String((__je2 && __je2.message) || __je2) };
  }
};
window.__pjFeedXp = function (__u, __n) {
  try {
    var a = window.__pjJourneyLeague();
    if (!a || !a.players || !a.players[__u]) return { ok: 0, err: "no-player" };
    var __p = a.players[__u];
    var __tm = a.teams[0];
    for (var __q = 0; __q < a.teams.length; __q++) {
      if (!a.teams[__q].gym && !a.teams[__q].elite) {
        __tm = a.teams[__q];
        break;
      }
    }
    var __mineL = __tm.roster.concat(a.box || []);
    if (__mineL.indexOf(__u) < 0) return { ok: 0, err: "not-mine" };
    var __ev = [];
    var __nm2 = getPokemon(__p.dex).name;
    __p.xp = (__p.xp || 0) + __n;
    while (__p.xp >= xpToNext(__p.level)) {
      __p.xp -= xpToNext(__p.level);
      __p.level++;
      var __g = rollGrowth(__p);
      __ev.push("LV".concat(__p.level, " ").concat(__g.join(" ")));
      var __P = EVOLUTIONS[__p.dex];
      if (__P && __p.level >= __P.level) {
        __p.evolvedFrom = __p.dex;
        __p.dex = __P.to[Math.floor(Math.random() * __P.to.length)];
        __ev.push("EVOLVED: ".concat(__nm2, " -> ").concat(getPokemon(__p.dex).name));
        if (a.journey && a.dex && !a.dex[__p.dex]) {
          a.dex[__p.dex] = 1;
          a.coins = (a.coins || 0) + 50;
        }
        __nm2 = getPokemon(__p.dex).name;
      }
    }
    Nr(a);
    return { ok: 1, level: __p.level, events: __ev };
  } catch (__je3) {
    return { ok: 0, err: String((__je3 && __je3.message) || __je3) };
  }
};
function fn(a) {
  var t;
  const e = (s) => isMythical(a.players[s].dex);
  ((a.freeAgents = a.freeAgents.filter((s) => !e(s))),
    a.rookies && (a.rookies.pool = a.rookies.pool.filter((s) => !e(s) || a.rookies.picks.includes(s))));
  for (const s of a.teams)
    for (const n of s.roster.filter(e)) {
      const o = buildTeamPlayerView(a, n),
        r = [...a.freeAgents].sort((l, c) => buildTeamPlayerView(a, c).ovr - buildTeamPlayerView(a, l).ovr),
        i = (t = r.find((l) => buildTeamPlayerView(a, l).pos === o.pos)) != null ? t : r[0];
      i &&
        ((s.roster = s.roster.map((l) => (l === n ? i : l))),
        s.lineup && (s.lineup = s.lineup.map((l) => (l === n ? i : l))),
        a.freeAgents.splice(a.freeAgents.indexOf(i), 1),
        a.news.unshift(
          ""
            .concat(o.name, " left the league (retired from Poké Jam). ")
            .concat(s.name, " signed ")
            .concat(buildTeamPlayerView(a, i).name, "."),
        ));
    }
  a.news = a.news.slice(0, 8);
}
const Cs = /^#[0-9a-f]{3,8}$/i;
function ba(a) {
  var e, t, s;
  if (!Array.isArray(a) || !a.length) return !1;
  for (const [n, o] of a.entries()) {
    if (!o || typeof o != "object") return !1;
    ((o.name = profanityFn(
      String((e = o.name) != null ? e : "").slice(0, 24) || "Team",
      o.human ? "Pallet Town" : (s = (t = LEAGUE_GYMS[n - 1]) == null ? void 0 : t.name) != null ? s : "Team",
    )),
      (o.abbr = challengeStorage(o.abbr, o.name)),
      (typeof o.color != "string" || !Cs.test(o.color)) && (o.color = As.color),
      (typeof o.color2 != "string" || !Cs.test(o.color2)) && (o.color2 = As.color2));
  }
  return !0;
}
function zr() {
  try {
    const a = localStorage.getItem(saveKeyRoute);
    if (!a) return null;
    const e = JSON.parse(a);
    if (
      (e == null ? void 0 : e.version) !== 1 ||
      !ba(e.teams) ||
      typeof e.players != "object" ||
      !Array.isArray(e.games)
    )
      return null;
    try {
      window.__pjLeagueRef = e;
    } catch (__zr) {}
    try {
      window.__PJ_STORY__ && window.__PJ_STORY__.reconcile(e);
    } catch (__e) {}
    return (fn(e), e);
  } catch {
    return null;
  }
}
const ss = "pokejam.draft.v1";
function Br(a) {
  try {
    a ? localStorage.setItem(ss, JSON.stringify(a)) : localStorage.removeItem(ss);
  } catch {}
}
function Hr() {
  try {
    const a = localStorage.getItem(ss);
    if (!a) return null;
    const e = JSON.parse(a);
    return ba(e == null ? void 0 : e.teams) && Array.isArray(e.order) && Array.isArray(e.taken) ? e : null;
  } catch {
    return null;
  }
}
function ga(a) {
  const e = (t) => (t.w + t.l ? t.w / (t.w + t.l) : 0);
  return [...a.teams].sort((t, s) => e(s) - e(t) || s.pf - s.makeEmptyStats - (t.pf - t.makeEmptyStats) || s.pf - t.pf);
}
const kt = (a, e = a.week) => a.games.filter((t) => t.week === e),
  Wr = (a) => {
    var e;
    return (e = kt(a).find((t) => !t.score && (t.home === 0 || t.away === 0))) != null ? e : null;
  },
  Ue = (a) => {
    var e;
    return (e = a.weeks) != null ? e : 10;
  },
  as = (a) => Ue(a) + 1,
  jr = (a) => Ue(a) + 2;
function qr(a, e = a.week) {
  return e <= Ue(a) ? "Week ".concat(e, " of ").concat(Ue(a)) : e === as(a) ? "Semifinals" : "Final";
}
function Ur(a) {
  const e = new Set();
  for (const t of a.games) {
    if (!t.score || (t.home !== 0 && t.away !== 0)) continue;
    const s = t.home === 0 ? t.away : t.home,
      n = a.teams[s];
    (t.home === 0 ? t.score[0] > t.score[1] : t.score[1] > t.score[0]) && (n.gym || n.elite) && e.add(s);
  }
  return e;
}
function Gs(a, e, t) {
  const s = a.teams[e],
    n = new Map(),
    { starters: o, bench: r } = pickHealthyStarters(a, s),
    i = (c) => {
      const h = buildTeamPlayerView(a, c);
      return (n.set(h, c), h);
    },
    l = o.map(i);
  return {
    def: {
      name: s.name,
      abbr: s.abbr,
      color: s.color,
      color2: s.color2,
      roster: l,
      bench: r.map(i),
      human: t,
      boost: s.boost,
      coach: s.leader,
    },
    uidOf: n,
  };
}
function va(a, e) {
  return Ls(a.color, e.color) >= 110 ? e : { ...e, color: Ls(a.color, "#e3350d") < 110 ? "#f4f1e8" : "#e3350d" };
}
function Ls(a, e) {
  const t = (o) => [1, 3, 5].map((r) => parseInt(o.slice(r, r + 2), 16)),
    [s, n] = [t(a), t(e)];
  return Math.hypot(s[0] - n[0], s[1] - n[1], s[2] - n[2]);
}
function dn(a, e) {
  const t = a.teams[e];
  return t.human ? un(t.name) : ms(t);
}
function _r(a, e, t, s, n, o = !0) {
  const i = e.home === 0 || e.away === 0 ? [0, e.home === 0 ? e.away : e.home] : [e.home, e.away],
    l = Gs(a, i[0], t && i[0] === 0),
    c = Gs(a, i[1], !1);
  c.def = va(l.def, c.def);
  const h = new Map([...l.uidOf, ...c.uidOf]);
  return {
    cfg: {
      home: l.def,
      away: c.def,
      quarterLen: s,
      difficulty: n,
      court: dn(a, e.home),
      stamina: !0,
      injuries: !0,
      userAutoSubs: o,
    },
    sides: i,
    uidOf: h,
  };
}
function Kr(a) {
  return new Promise((e) => {
    const t = new MatchEngine(a);
    let s = 0;
    const n = () => t.phase === "final" || s >= 4e5,
      o = () => {
        const r = performance.now();
        for (; !n() && performance.now() - r < 14;) {
          for (let i = 0; i < 120 && !n(); i++, s++) t.update(1 / 60);
          ((t.events.length = 0), (t.sfx.length = 0));
        }
        n() ? e(t) : setTimeout(o, 0);
      };
    o();
  });
}
function rollGrowth(a, e = Math.random) {
  var r, i;
  const t = getPokemon(a.dex),
    s = weightsOf(t.pos),
    n = Object.keys(STAT_LABELS),
    o = [];
  for (let l = 0; l < 2; l++) {
    const c = n.map((f) => {
      var u;
      return ((u = s[f]) != null ? u : 0) + 0.04;
    });
    let h = e() * c.reduce((f, u) => f + u, 0),
      d = n[0];
    for (let f = 0; f < n.length; f++)
      if (((h -= c[f]), h <= 0)) {
        d = n[f];
        break;
      }
    t.r[d] + ((r = a.bonus[d]) != null ? r : 0) >= 99 ||
      ((a.bonus[d] = ((i = a.bonus[d]) != null ? i : 0) + 1), o.push("+1 ".concat(STAT_LABELS[d])));
  }
  return o;
}
function settleMatch(a, e, t, s, n) {
  var h, d;
  const o = { [s[0]]: t.score[0], [s[1]]: t.score[1] };
  e.score = [o[e.home], o[e.away]];
  const r = e.score[0] > e.score[1] ? e.home : e.away;
  if (!e.round || e.round === "week")
    for (const f of [e.home, e.away]) {
      const u = a.teams[f],
        m = f === r;
      ((u.w += m ? 1 : 0),
        (u.l += m ? 0 : 1),
        (u.pf += o[f]),
        (u.makeEmptyStats += o[f === e.home ? e.away : e.home]),
        (u.streak = m ? Math.max(1, u.streak + 1) : Math.min(-1, u.streak - 1)));
    }
  const i = [];
  let l = -1 / 0;
  const c = t.cfg.quarterLen * 4;
  for (const f of [...t.rosterOf(0), ...t.rosterOf(1)]) {
    const u = n.get(f.mon);
    if (!u) continue;
    const m = a.players[u],
      p = f.stats;
    (p.sec > 0 && m.stats.gp++,
      f.hurt &&
        ((m.injury = Math.max((h = m.injury) != null ? h : 0, f.hurt + 1)),
        a.news.unshift(
          ""
            .concat(a.teams[s[f.team]].name, "'s ")
            .concat(f.mon.name, " is out ")
            .concat(f.hurt, " week")
            .concat(f.hurt > 1 ? "s" : "", "."),
        )));
    for (const k of Object.keys(p)) m.stats[k] = ((d = m.stats[k]) != null ? d : 0) + p[k];
    const y = ts(p);
    y > l && ((l = y), (e.pog = u));
    const v = s[f.team],
      b = Math.min(1, p.sec / c);
    for (
      m.xp += Math.round(5 + 10 * b + p.pts * 0.8 + p.reb + p.ast * 1.5 + (p.stl + p.blk) * 2 + (v === r ? 10 * b : 0));
      m.xp >= xpToNext(m.level);
    ) {
      ((m.xp -= xpToNext(m.level)), m.level++);
      const k = getPokemon(m.dex).name,
        w = { uid: u, team: v, name: k, level: m.level, gains: rollGrowth(m) },
        P = EVOLUTIONS[m.dex];
      if (P && m.level >= P.level) {
        ((w.evolvedFrom = m.dex), (m.dex = P.to[Math.floor(Math.random() * P.to.length)]), (w.evolvedTo = m.dex));
        try {
          window.__PJ_JOURNEY__ && window.__PJ_JOURNEY__.onEvolve && window.__PJ_JOURNEY__.onEvolve(a, m);
        } catch (__oe) {}
        const S = a.teams[v];
        a.news.unshift("".concat(S.name, "'s ").concat(k, " evolved into ").concat(getPokemon(m.dex).name, "!"));
      }
      i.push(w);
    }
  }
  return (
    (e.q = t.quarter),
    (e.box = [...t.rosterOf(0), ...t.rosterOf(1)].flatMap((f) => {
      const u = n.get(f.mon);
      if (!u) return [];
      const m = f.stats;
      return [
        [
          u,
          f.mon.dex,
          s[f.team] === e.home ? 0 : 1,
          f.starter ? 1 : 0,
          Math.round(m.sec),
          m.pts,
          m.fgm,
          m.fga,
          m.tpm,
          m.tpa,
          m.reb,
          m.ast,
          m.stl,
          m.blk,
          m.dnk,
        ],
      ];
    })),
    (a.news = a.news.slice(0, 8)),
    i
  );
}
function __pjAiGrow(a) {
  try {
    var __me2 = 0,
      __j;
    for (__j = 0; __j < a.teams.length; __j++) {
      if (!a.teams[__j].gym && !a.teams[__j].elite) {
        __me2 = __j;
        break;
      }
    }
    for (var __t2 = 0; __t2 < a.teams.length; __t2++) {
      if (__t2 === __me2) continue;
      var __tm = a.teams[__t2],
        __rs = __tm.roster.slice();
      for (var __r2 = 0; __r2 < __rs.length; __r2++) {
        var __p = a.players[__rs[__r2]];
        if (!__p) continue;
        __p.xp = (__p.xp || 0) + 2 + Math.floor(Math.random() * 5);
        while (__p.xp >= xpToNext(__p.level)) {
          __p.xp -= xpToNext(__p.level);
          __p.level++;
          var __P = EVOLUTIONS[__p.dex];
          if (__P && __p.level >= __P.level) {
            var __old = getPokemon(__p.dex).name;
            __p.evolvedFrom = __p.dex;
            __p.dex = __P.to[Math.floor(Math.random() * __P.to.length)];
            a.news.unshift("EVOLVED: ".concat(__old, " -> ").concat(getPokemon(__p.dex).name, " (").concat(__tm.name, ")"));
          }
        }
      }
    }
  } catch (__ae) {}
}
function __pjExpiry(a) {
  try {
    var __me3 = 0,
      __j2;
    for (__j2 = 0; __j2 < a.teams.length; __j2++) {
      if (!a.teams[__j2].gym && !a.teams[__j2].elite) {
        __me3 = __j2;
        break;
      }
    }
    for (var __t3 = 0; __t3 < a.teams.length; __t3++) {
      if (__t3 === __me3) continue;
      var __tm = a.teams[__t3],
        __n = 0;
      for (var __r3 = 0; __r3 < __tm.roster.length && __n < 2;) {
        var __uid = __tm.roster[__r3],
          __p = a.players[__uid];
        if (__p && (__p.level || 0) >= 3 && Math.random() < 0.2) {
          __tm.roster.splice(__r3, 1);
          __tm.lineup &&
            (__tm.lineup = __tm.lineup.filter(function (x) {
              return x !== __uid;
            }));
          a.freeAgents.push(__uid);
          __n++;
          a.news.unshift("CONTRACT EXPIRED: ".concat(getPokemon(__p.dex).name, " (").concat(__tm.name, ")"));
        } else __r3++;
      }
    }
  } catch (__ee2) {}
}
window.__pjTeamOvr = function (f) {
  try {
    var __me = 0,
      __i;
    for (__i = 0; __i < f.teams.length; __i++) {
      if (!f.teams[__i].gym && !f.teams[__i].elite) {
        __me = __i;
        break;
      }
    }
    var __ovrs = f.teams[__me].roster
      .map(function (u) {
        var p = f.players[u];
        return buildPlayer(p.dex, p.bonus || {}).ovr;
      })
      .sort(function (a, b) {
        return b - a;
      });
    var __n = Math.min(5, __ovrs.length),
      __s = 0;
    for (var __k = 0; __k < __n; __k++) __s += __ovrs[__k];
    return __n ? Math.round(__s / __n) : 0;
  } catch (e) {
    return 0;
  }
};
window.__pjCrown = function (a, __mg) {
  a.champion = __mg.score[0] > __mg.score[1] ? __mg.home : __mg.away;
  a.phase = "done";
  a.awards = pn(a);
  var __mA = a.awards.find(function (n) {
    return n.key === "mvp";
  });
  a.mvp = __mA == null ? void 0 : __mA.uid;
  for (const __n of [...a.awards].reverse())
    a.news.unshift(
      ""
        .concat(__n.label, ": ")
        .concat(buildTeamPlayerView(a, __n.uid).name, " (")
        .concat(a.teams[__n.team].abbr, "), ")
        .concat(__n.line),
    );
  a.history = a.history || [];
  var __ct = a.teams[a.champion];
  a.history.push({ season: a.season, champion: __ct.name, mvp: a.mvp ? getPokemon(a.players[a.mvp].dex).name : "—" });
  a.news = a.news || [];
  a.news.unshift("".concat(__ct.name, " win the Season ").concat(a.season, " championship!"));
  a.news = a.news.slice(0, 8);
  try {
    window.__PJ_STORY__.onChampion(a);
  } catch (__ce) {}
};
function Yr(a) {
  if (window.__PJ_STORY__ && __pjIsStory(a)) {
    var __me = 0,
      __ti;
    for (__ti = 0; __ti < a.teams.length; __ti++) {
      if (!a.teams[__ti].gym && !a.teams[__ti].elite) {
        __me = __ti;
        break;
      }
    }
    var __gs = kt(a),
      __mg = null,
      __gi2;
    for (__gi2 = 0; __gi2 < __gs.length; __gi2++) {
      if (__gs[__gi2].home === __me || __gs[__gi2].away === __me) {
        __mg = __gs[__gi2];
        break;
      }
    }
    if (__mg && __mg.score) {
      var __win = __mg.home === __me ? __mg.score[0] > __mg.score[1] : __mg.score[1] > __mg.score[0];
      if (!__win && a.phase === "season") {
        __mg.score = null;
        a.retryCount = (a.retryCount || 0) + 1;
        window.__PJ_STORY__.onRetry(a);
        return;
      }
      if (__win && a.phase === "season" && a.week >= Ue(a)) {
        window.__pjCrown(a, __mg);
        return;
      }
      if (!a.campaign) __pjAiGrow(a);
    }
  }
  function __pjIsStory(a) {
    try {
      if (!window.__PJ_STORY__ || !a || !a.games || !a.teams) return !1;
      var __me = 0,
        __ti;
      for (__ti = 0; __ti < a.teams.length; __ti++) {
        if (!a.teams[__ti].gym && !a.teams[__ti].elite) {
          __me = __ti;
          break;
        }
      }
      var g1 = null;
      for (var i = 0; i < a.games.length; i++) {
        var g = a.games[i];
        if (g.round === "week" && g.week === 1 && (g.home === __me || g.away === __me)) {
          g1 = g;
          break;
        }
      }
      if (!g1) return !1;
      var opp = g1.home === __me ? g1.away : g1.home;
      var t1 = a.teams[opp];
      return !!(t1 && t1.gym === 1);
    } catch (e) {
      return !1;
    }
  }
  var e;
  if (!kt(a).some((t) => !t.score)) {
    for (const t of Object.values(a.players)) t.injury && t.injury--;
    if (a.phase === "season" && a.week < Ue(a)) a.week++;
    else if (a.phase === "season") {
      const t = ga(a)
        .slice(0, 4)
        .map((s) => s.id);
      ((a.phase = "playoffs"),
        (a.week = as(a)),
        a.games.push(
          { week: a.week, home: t[0], away: t[3], score: null, round: "semi" },
          { week: a.week, home: t[1], away: t[2], score: null, round: "semi" },
        ),
        a.news.unshift(
          "Playoffs set: ".concat(t.map((s, n) => "".concat(n + 1, ". ").concat(a.teams[s].name)).join(", ")),
        ));
    } else if (a.week === as(a)) {
      const t = kt(a).map((s) => (s.score[0] > s.score[1] ? s.home : s.away));
      (a.week++, a.games.push({ week: a.week, home: t[0], away: t[1], score: null, round: "final" }));
    } else {
      const t = kt(a)[0];
      ((a.champion = t.score[0] > t.score[1] ? t.home : t.away),
        (a.phase = "done"),
        (a.awards = pn(a)),
        (a.mvp = (e = a.awards.find((n) => n.key === "mvp")) == null ? void 0 : e.uid));
      for (const n of [...a.awards].reverse())
        a.news.unshift(
          "".concat(n.label, ": ").concat(buildTeamPlayerView(a, n.uid).name, " (").concat(a.teams[n.team].abbr, "), ").concat(n.line),
        );
      const s = a.teams[a.champion];
      (a.history.push({ season: a.season, champion: s.name, mvp: a.mvp ? getPokemon(a.players[a.mvp].dex).name : "—" }),
        a.news.unshift("".concat(s.name, " win the Season ").concat(a.season, " championship!")));
    }
    a.news = a.news.slice(0, 8);
  }
}
function pn(a) {
  const e = a.teams
      .flatMap((c) => c.roster.map((h) => ({ uid: h, team: c.id, p: a.players[h] })))
      .filter(({ p: c }) => c.stats.gp >= 4),
    t = (c, h) => {
      var d;
      return ((d = c.stats[h]) != null ? d : 0) / c.stats.gp;
    },
    s = (c) =>
      ""
        .concat(t(c, "pts").toFixed(1), " PPG · ")
        .concat(t(c, "reb").toFixed(1), " RPG · ")
        .concat(t(c, "ast").toFixed(1), " APG"),
    n = (c, h) => [...c].sort((d, f) => h(f.p) - h(d.p))[0],
    o = [],
    r = (c, h, d, f) => {
      d && o.push({ key: c, label: h, uid: d.uid, team: d.team, line: f(d.p) });
    };
  (r(
    "mvp",
    "MVP",
    n(e, (c) => ts(c.stats) / c.stats.gp),
    s,
  ),
    r(
      "scoring",
      "Scoring title",
      n(e, (c) => t(c, "pts")),
      (c) => "".concat(t(c, "pts").toFixed(1), " PPG"),
    ),
    r(
      "dpoy",
      "Defensive Player",
      n(e, (c) => t(c, "stl") * 2 + t(c, "blk") * 2 + t(c, "reb") * 0.5),
      (c) => "".concat(t(c, "stl").toFixed(1), " STL · ").concat(t(c, "blk").toFixed(1), " BLK"),
    ));
  const i = e.filter(({ p: c }) => {
    var h;
    return ((h = c.stats.gs) != null ? h : 0) <= c.stats.gp / 2;
  });
  r(
    "smoy",
    "Sixth Man",
    n(i, (c) => ts(c.stats) / c.stats.gp),
    s,
  );
  const l = e.filter(({ uid: c, p: h }) => h.ovrStart !== void 0 && buildTeamPlayerView(a, c).ovr - h.ovrStart >= 1);
  return (
    r(
      "mip",
      "Most Improved",
      n(l, (c) => {
        var h;
        return buildPlayer(c.dex, c.bonus).ovr - ((h = c.ovrStart) != null ? h : 0);
      }),
      (c) => "".concat(c.ovrStart, " → ").concat(buildPlayer(c.dex, c.bonus).ovr, " OVR"),
    ),
    o
  );
}
function yn(a) {
  (a.season++,
    (a.week = 1),
    (a.phase = "season"),
    (a.champion = void 0),
    (a.mvp = void 0),
    (a.signedWeek = 0),
    (a.games = window.__PJ_STORY_SCHEDULE__ ? window.__PJ_STORY_SCHEDULE__(a, ya) : ya(a.teams.length, !a.weeks)));
  for (const e of a.teams) Object.assign(e, { w: 0, l: 0, pf: 0, makeEmptyStats: 0, streak: 0 });
  for (const [e, t] of Object.entries(a.players)) ((t.stats = makeEmptyStats()), (t.ovrStart = buildTeamPlayerView(a, e).ovr), (t.injury = 0));
  ((a.awards = void 0), (a.news = ["Season ".concat(a.season, " tips off.")]));
}
const bn = (a) => a.phase !== "done" && a.signedWeek < a.week,
  gn = (a) => Math.max(1, Ue(a) - 3),
  vn = (a) => (a.phase === "season" && a.week <= gn(a)) || a.phase === "done";
function Tt(a, e, t) {
  var i;
  const s = a.players[e],
    n = buildTeamPlayerView(a, e);
  let o = Math.pow(Math.max(0, n.ovr - 55), 1.5);
  const r = EVOLUTIONS[s.dex];
  if (r) {
    const l = Math.max(...r.to.map((h) => buildPlayer(h, s.bonus).ovr)),
      c = Math.max(0, r.level - s.level);
    o += Math.max(0, Math.pow(Math.max(0, l - 55), 1.5) - o) * (0.55 - c * 0.08);
  }
  return (
    ((i = s.injury) != null ? i : 0) > 0 && (o *= 0.75),
    t != null && t.types && n.types.some((l) => t.types.includes(l)) && (o *= 1.15),
    o
  );
}
function kn(a, e, t, s) {
  var h;
  if (!vn(a)) return { ok: !1, lean: 0, reason: "The trade deadline has passed. Trading reopens in the offseason." };
  if (!t.length || t.length !== s.length)
    return { ok: !1, lean: 0, reason: "Pick the same number of players on each side (1 or 2)." };
  const n = a.teams[e],
    o = t.reduce((d, f) => d + Tt(a, f, n), 0),
    r = s.reduce((d, f) => d + Tt(a, f, n), 0),
    i = o / Math.max(1, r * 1.05),
    l = Math.max(-1, Math.min(1, (i - 1) * 2.5)),
    c = (h = n.leader) != null ? h : n.name;
  return i >= 1
    ? { ok: !0, lean: l, reason: "".concat(c, ': "Deal!"') }
    : i >= 0.85
      ? { ok: !1, lean: l, reason: "".concat(c, ': "Close. Add a little more."') }
      : i >= 0.6
        ? { ok: !1, lean: l, reason: "".concat(c, ': "That\'s not enough."') }
        : { ok: !1, lean: l, reason: "".concat(c, ': "Not even close."') };
}
function Jr(a, e, t, s) {
  if (!kn(a, e, t, s).ok) return !1;
  const n = a.teams[0],
    o = a.teams[e];
  ((n.roster = n.roster.map((i) => (t.includes(i) ? s[t.indexOf(i)] : i))),
    (o.roster = o.roster.map((i) => (s.includes(i) ? t[s.indexOf(i)] : i))),
    n.lineup && (n.lineup = n.lineup.map((i) => (t.includes(i) ? s[t.indexOf(i)] : i))),
    delete o.lineup);
  const r = (i) => i.map((l) => buildTeamPlayerView(a, l).name).join(" and ");
  return (
    a.news.unshift("Trade! ".concat(n.name, " send ").concat(r(t), " to ").concat(o.name, " for ").concat(r(s), ".")),
    (a.news = a.news.slice(0, 8)),
    !0
  );
}
function Qr(a, e, t) {
  const s = a.teams[0],
    n = s.roster.indexOf(e),
    o = a.freeAgents.indexOf(t);
  n < 0 ||
    o < 0 ||
    !bn(a) ||
    ((s.roster[n] = t),
    s.lineup && (s.lineup = s.lineup.map((r) => (r === e ? t : r))),
    (a.freeAgents[o] = e),
    (a.signedWeek = a.week),
    a.news.unshift("".concat(s.name, " signed ").concat(buildTeamPlayerView(a, t).name, " and released ").concat(buildTeamPlayerView(a, e).name, ".")),
    (a.news = a.news.slice(0, 8)));
}
function Ie(a, e = {}) {
  const t = (o) => buildPlayer(o, e).ovr;
  let s = { dex: a, ovr: t(a), level: 1 };
  const n = (o, r) => {
    const i = EVOLUTIONS[o];
    if (!(!i || r > 3))
      for (const l of i.to) {
        const c = t(l);
        (c > s.ovr && (s = { dex: l, ovr: c, level: i.level }), n(l, r + 1));
      }
  };
  return (n(a, 0), s);
}
const ft = 24,
  ka = 91,
  Sn = 62,
  wn = (a) => a >= Sn && a <= ka;
function Pn(a) {
  let e = a | 0;
  return () => {
    e = (e + 1831565813) | 0;
    let t = Math.imul(e ^ (e >>> 15), 1 | e);
    return ((t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t), ((t ^ (t >>> 14)) >>> 0) / 4294967296);
  };
}
const xn = (a) => {
  let e = 2166136261;
  for (let t = 0; t < a.length; t++) e = Math.imul(e ^ a.charCodeAt(t), 16777619);
  return e >>> 0;
};
function Mn(a) {
  var e;
  return (
    (e = a.seed) != null ||
      (a.seed = xn(
        a.teams.map((t) => "".concat(t.name, ":").concat(t.roster.join(","))).join("|") + Object.keys(a.players).length,
      )),
    a.seed
  );
}
const Tn = (() => {
  const a = new Set(Object.values(EVOLUTIONS).flatMap((e) => e.to));
  return (e) => !a.has(e);
})();
function $n(a, e, t, s) {
  var c, h;
  const n = [...a],
    o = [],
    r = {},
    i = {},
    l = Math.ceil(e / 4);
  for (; o.length < e && n.length;) {
    const d = n.map((p) => {
      var k, w;
      const y = getPokemon(p),
        v = (k = i[y.pos]) != null ? k : 0;
      let b = Math.exp((Ie(p, s(p)).ovr - 76) / 12);
      for (const P of y.types) b *= Math.pow(0.45, (w = r[P]) != null ? w : 0);
      return ((b *= v === 0 ? 3 : v >= l ? 0.15 : Math.pow(0.7, v)), b);
    });
    let f = t() * d.reduce((p, y) => p + y, 0),
      u = 0;
    for (; u < n.length - 1 && (f -= d[u]) > 0;) u++;
    const m = getPokemon(n[u]);
    for (const p of m.types) r[p] = ((c = r[p]) != null ? c : 0) + 1;
    ((i[m.pos] = ((h = i[m.pos]) != null ? h : 0) + 1), o.push(n.splice(u, 1)[0]));
  }
  return o;
}
function En(a, e) {
  const t = e(),
    s = (e() + e() + e() + e() - 2) * 3.5;
  let n = t < 0.06 ? 5 : t < 0.12 ? -5 : Math.round(s);
  const o = (r) => Object.fromEntries(Object.keys(STAT_LABELS).map((i) => [i, r]));
  for (; n > 0 && Ie(a, o(n)).ovr > Math.max(ka, Ie(a).ovr);) n--;
  return n ? o(n) : {};
}
function Xr(a) {
  var f;
  if (a.phase !== "done" || a.rookies) return;
  if (window.__PJ_STORY__ && __pjIsStory(a)) __pjExpiry(a);
  const e = Pn(Mn(a) ^ Math.imul(a.season, 2654435761)),
    t = (f = a.classes) != null ? f : [],
    s = a.freeAgents
      .filter((u) => a.players[u].level === 1 && Tn(a.players[u].dex) && wn(Ie(a.players[u].dex).ovr))
      .sort((u, m) => a.players[u].dex - a.players[m].dex),
    n = new Map();
  for (const u of s) n.has(a.players[u].dex) || n.set(a.players[u].dex, u);
  let o = t.slice(-3);
  const r = () => [...n.keys()].filter((u) => !o.some((m) => m.dexes.includes(u)));
  for (; r().length < ft && o.length;) o = o.slice(1);
  let i = r();
  if (i.length < ft) {
    for (const u of a.freeAgents
      .filter((m) => !n.has(a.players[m].dex))
      .sort((m, p) => a.players[m].dex - a.players[p].dex))
      n.has(a.players[u].dex) || n.set(a.players[u].dex, u);
    ((i = [...n.keys()].filter((u) => !o.some((m) => m.dexes.includes(u)))), i.length < ft && (i = [...n.keys()]));
  }
  const l = new Map(i.map((u) => [u, En(u, e)])),
    h = $n(i, ft, e, (u) => {
      var m;
      return (m = l.get(u)) != null ? m : {};
    }).map((u) => n.get(u));
  for (const u of h) a.players[u].bonus = { ...l.get(a.players[u].dex) };
  (h.sort((u, m) => Ie(a.players[m].dex, a.players[m].bonus).ovr - Ie(a.players[u].dex, a.players[u].bonus).ovr),
    (a.classes = [
      ...t.filter((u) => u.season !== a.season),
      { season: a.season, dexes: h.map((u) => a.players[u].dex) },
    ].slice(-6)));
  const d = ga(a)
    .reverse()
    .map((u) => u.id);
  (a.champion !== void 0 && d.push(...d.splice(d.indexOf(a.champion), 1)),
    (a.rookies = { order: d, picks: [], pool: h }));
}
const Sa = (a) =>
    a.rookies && a.rookies.picks.length < a.rookies.order.length
      ? a.teams[a.rookies.order[a.rookies.picks.length]]
      : null,
  Fn = (a) => (a.rookies ? a.rookies.pool.filter((e) => !a.rookies.picks.includes(e)) : []);
function Is(a, e, t) {
  var r;
  const s = buildTeamPlayerView(a, e),
    n = Ie(s.dex, a.players[e].bonus),
    o = t.roster.filter((i) => buildTeamPlayerView(a, i).pos === s.pos).length;
  return (
    n.ovr * 1.2 +
    s.ovr * 0.3 -
    n.level * 1.5 +
    (o === 0 ? 6 : o === 1 ? 2 : 0) +
    ((r = t.types) != null &&
    r.length &&
    s.types.some((i) => t.types.includes(i)) &&
    !t.roster.some((i) => buildTeamPlayerView(a, i).types.some((l) => t.types.includes(l)))
      ? 5
      : 0) +
    Math.random() * 3
  );
}
function Zr(a, e) {
  const t = Sa(a),
    s = Fn(a);
  if (!t || !s.length) return null;
  const n = e && s.includes(e) ? e : s.reduce((o, r) => (Is(a, r, t) > Is(a, o, t) ? r : o));
  return (
    a.rookies.picks.push(n),
    t.roster.push(n),
    t.lineup && t.lineup.push(n),
    a.freeAgents.splice(a.freeAgents.indexOf(n), 1),
    n
  );
}
function ei(a, e) {
  const t = a.rookies;
  if (!t || Sa(a)) return;
  const s = (i, l) => {
      ((i.roster = i.roster.filter((c) => c !== l)),
        i.lineup && (i.lineup = i.lineup.filter((c) => c !== l)),
        a.freeAgents.push(l));
    },
    n = a.teams[0];
  n.roster.includes(e) && s(n, e);
  for (const i of a.teams)
    i.human ||
      i.roster.length <= 10 ||
      s(
        i,
        i.roster.reduce((l, c) => (Tt(a, c, i) < Tt(a, l, i) ? c : l)),
      );
  const o = t.picks[t.order.indexOf(0)];
  (delete a.rookies,
    yn(a),
    (a.draftedRookie = o && n.roster.includes(o) ? o : void 0),
    o &&
      n.roster.includes(o) &&
      a.news.push("".concat(n.name, " drafted ").concat(buildTeamPlayerView(a, o).name, " in the rookie draft.")));
  const r = t.picks[0];
  a.news.push("".concat(a.teams[t.order[0]].name, " took ").concat(buildTeamPlayerView(a, r).name, " first overall."));
}
const Os = "pokejam.announcer",
  An = 0.28,
  Cn = { buzzer: 0.7, shotclock: 0.4 };
class ys {
  constructor(e) {
    ((this.audio = e),
      (this.on = !0),
      (this.buffers = new Map()),
      (this.loading = new Set()),
      (this.src = null),
      (this.out = null),
      (this.speakTimer = 0),
      (this.spoke = !1));
    try {
      this.on = localStorage.getItem(Os) !== "0";
    } catch {}
  }
  load(e) {
    const t = this.audio.context;
    if (t)
      for (const s of e)
        this.buffers.has(s) ||
          this.loading.has(s) ||
          (this.loading.add(s),
          fetch("./announcer/".concat(s, ".mp3"))
            .then((n) => (n.ok ? n.arrayBuffer() : Promise.reject(new Error(String(n.status)))))
            .then((n) => t.decodeAudioData(n))
            .then((n) => this.buffers.set(s, n))
            .catch(() => {})
            .finally(() => this.loading.delete(s)));
  }
  setOn(e) {
    this.on = e;
    try {
      localStorage.setItem(Os, e ? "1" : "0");
    } catch {}
    e || this.stop();
  }
  get live() {
    return this.on && !this.audio.muted;
  }
  length(e) {
    var t, s;
    return this.live && (s = (t = this.buffers.get(e)) == null ? void 0 : t.duration) != null ? s : 0;
  }
  static hornDelay(e) {
    return e.reduce((t, s) => {
      var n;
      return Math.max(t, (n = Cn[s]) != null ? n : 0);
    }, 0);
  }
  say(e, t = 0) {
    const s = this.audio.context,
      n = this.buffers.get(e);
    if (!s || !n || !this.live) return;
    ((!this.out || this.out.context !== s) &&
      ((this.out = s.createGain()), (this.out.gain.value = An), this.out.connect(s.destination)),
      this.stop());
    const o = s.createBufferSource();
    ((o.buffer = n),
      o.connect(this.out),
      o.start(s.currentTime + t),
      (o.onended = () => {
        this.src === o && (this.src = null);
      }),
      (this.src = o));
  }
  speak(e, t = 0) {
    if (!this.live || typeof speechSynthesis == "undefined" || typeof SpeechSynthesisUtterance == "undefined") return;
    this.stop();
    const s = () => {
      if (((this.speakTimer = 0), !!this.live))
        try {
          const n = new SpeechSynthesisUtterance(e);
          ((n.lang = "en-US"), (n.rate = 1.02), (n.pitch = 0.85), (this.spoke = !0), speechSynthesis.speak(n));
        } catch {}
    };
    t > 0 ? (this.speakTimer = window.setTimeout(s, t * 1e3)) : s();
  }
  stop() {
    var e;
    try {
      (e = this.src) == null || e.stop();
    } catch {}
    if (((this.src = null), window.clearTimeout(this.speakTimer), (this.speakTimer = 0), this.spoke)) {
      this.spoke = !1;
      try {
        speechSynthesis.cancel();
      } catch {}
    }
  }
}
let dt = null;
function Gn(a) {
  return dt != null ? dt : (dt = new ys(a));
}
function Ln(a, e) {
  const t = [];
  for (let s = 0; s < e; s++) t.push(...(s % 2 ? [...a].reverse() : a));
  return t;
}
function Wt(a) {
  var t;
  const e = a % 100;
  return e >= 11 && e <= 13 ? "".concat(a, "th") : a + ((t = ["th", "st", "nd", "rd"][a % 10]) != null ? t : "th");
}
function ns(a) {
  var t, s;
  return (s =
    (t = [
      [92, "A+"],
      [91, "A"],
      [90, "A-"],
      [89, "B+"],
      [88, "B"],
      [87, "B-"],
      [86, "C+"],
      [84, "C"],
      [82, "C-"],
    ].find(([n]) => a >= n)) == null
      ? void 0
      : t[1]) != null
    ? s
    : "D";
}
function Nt(a) {
  const e = a.length ? Rt(ye(a).starters) : 0;
  return { ovr: e, grade: ns(e) };
}
function wa(a) {
  return a.types.map((e) => '<i style="--tc:'.concat(TYPE_COLORS[e], '">').concat(e, "</i>")).join("");
}
const In = Object.keys(STAT_LABELS);
function On(a, e = "", t = -1) {
  const s = In.map((n) =>
    '<i style="--v:'.concat(a.r[n], '%" title="').concat(STAT_LABELS[n], " ").concat(a.r[n], '"></i>'),
  ).join("");
  return '\n    <button class="mon-card t-'
    .concat(storageRead(a.ovr), " ")
    .concat(e, '" data-dex="')
    .concat(a.dex, '" ')
    .concat(t >= 0 ? 'style="--i:'.concat(t, '"') : "", ' aria-label="')
    .concat(escapeHtml(a.name), ", ")
    .concat(a.pos, ", overall ")
    .concat(a.ovr, '">\n      <span class="ovr">')
    .concat(a.ovr, '</span>\n      <span class="pos">')
    .concat(a.pos, '</span>\n      <span class="art"><img src="')
    .concat(le(a.dex), '" alt="" loading="lazy"></span>\n      <span class="nm">')
    .concat(escapeHtml(a.name), '</span>\n      <span class="types">')
    .concat(wa(a), '</span>\n      <span class="bars" aria-hidden="true">')
    .concat(s, "</span>\n    </button>");
}
const Rn = { PG: [50, 78], SG: [82, 56], SF: [18, 56], PF: [68, 28], C: [32, 24] },
  $t = [
    ["#3b6fd8", "#16224a"],
    ["#e3350d", "#4a0f05"],
    ["#21a366", "#0b3a26"],
    ["#d4a017", "#4a3606"],
    ["#8b5cf6", "#2a1a5e"],
    ["#e8e8f0", "#2a2a3a"],
  ],
  Dn = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
function Nn(a) {
  if (Dn()) return "";
  const e = [...a, "#ffd866", "#ff7a59", "#5fe0a0", "#7aa2ff"];
  return '<div class="confetti" aria-hidden="true">'.concat(
    Array.from({ length: 44 }, (t, s) =>
      '<i style="--x:'
        .concat((s * 37) % 100, "%;--d:")
        .concat(((s * 53) % 18) / 10, "s;--t:")
        .concat(2.4 + ((s * 29) % 15) / 10, "s;--r:")
        .concat((s * 71) % 360, "deg;--c:")
        .concat(e[s % e.length], '"></i>'),
    ).join(""),
    "</div>",
  );
}
function zn(a) {
  const { starters: e, bench: t, slots: s } = ye(a.picks),
    n = Rt(e),
    o = 1 + a.others.filter((l) => l > n).length,
    r = e
      .map((l, c) => {
        const [h, d] = Rn[s[c]],
          f = l.pos !== s[c] ? ' title="'.concat(escapeHtml(l.name), " (").concat(l.pos, ") covers ").concat(s[c], '"') : "";
        return '<span class="cp t-'
          .concat(storageRead(l.ovr), '" style="--x:')
          .concat(h, "%;--y:")
          .concat(d, "%;--k:")
          .concat(c, '"')
          .concat(f, '><img src="')
          .concat(le(l.dex), '" alt="')
          .concat(escapeHtml(l.name), '"><b>')
          .concat(s[c], "</b><small>")
          .concat(escapeHtml(l.name), "</small></span>");
      })
      .join(""),
    i = $t
      .map(([l, c], h) =>
        '<button class="sw '
          .concat(l === a.color ? "on" : "", '" data-sw="')
          .concat(h, '" style="--a:')
          .concat(l, ";--b:")
          .concat(c, '" aria-label="Team colors ')
          .concat(h + 1, '"></button>'),
      )
      .join("");
  return '\n    <div class="sum-bg" style="--tc:'
    .concat(a.color, ";--tc2:")
    .concat(a.color2, '">\n      ')
    .concat(
      Nn([a.color, a.color2]),
      '\n      <div class="sum" role="dialog" aria-label="Draft complete">\n        <p class="eyebrow">Draft complete</p>\n        <div class="sum-top">\n          <div class="sum-grade" aria-label="Grade ',
    )
    .concat(ns(n), '"><small>Grade</small><b>')
    .concat(ns(n), '</b></div>\n          <div class="sum-ovr"><small>Team OVR</small><b>')
    .concat(n, "</b><span>")
    .concat(
      o === 1 ? "Best in the league" : "#".concat(o, " of ").concat(a.others.length + 1, " drafts"),
      '</span></div>\n        </div>\n        <div class="mini-court" aria-label="Starting five">\n          <span class="key"></span><span class="arc"></span>',
    )
    .concat(r, "\n        </div>\n        ")
    .concat(
      t.length
        ? '<ul class="sum-bench">'.concat(
            t
              .map((l) =>
                '<li title="'
                  .concat(escapeHtml(l.name), " (")
                  .concat(l.pos, ", ")
                  .concat(l.ovr, ')"><img src="')
                  .concat(le(l.dex), '" alt="')
                  .concat(escapeHtml(l.name), '"></li>'),
              )
              .join(""),
            "</ul>",
          )
        : "",
      "\n        ",
    )
    .concat(
      a.customize
        ? '\n        <div class="sum-name">\n          <label for="sum-name">Team name</label>\n          <button type="button" id="sum-name" class="team-preset" title="Tap to switch">'
            .concat(escapeHtml(a.teamName), '</button>\n          <div class="swatches" role="group" aria-label="Team colors">')
            .concat(i, "</div>\n        </div>")
        : '<p class="sum-team">'.concat(escapeHtml(a.teamName), "</p>"),
      '\n        <div class="sum-actions">\n          <button class="ss-thumb" data-a="preview-draft" aria-label="See the share card full size" title="What you\'ll share"><span class="ss-thumb-ph">Drawing…</span></button>\n          <button class="btn primary big" data-a="continue">Continue</button>\n        </div>\n        <p class="note sum-share-status" role="status"></p>\n      </div>\n    </div>',
    );
}
const Pa = 1,
  os = ["missed", "semis", "final", "champion"],
  xe = 33,
  Bn = 160;
let Je = null;
function zt(a) {
  return a
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 20);
}
const Rs = (a) => {
    const e = /^#[0-9a-f]{6}$/i.test(a) ? a : "#3b6fd8";
    return [1, 3, 5].map((t) => parseInt(e.slice(t, t + 2), 16));
  },
  Ds = (a) => "#".concat(a.map((e) => e.toString(16).padStart(2, "0")).join(""));
function Hn(a) {
  var o;
  const e = new TextEncoder().encode(zt(a.name)).slice(0, 60),
    t = new Uint8Array(xe + e.length);
  ((t[0] = Pa),
    a.dex.slice(0, 10).forEach((r, i) => {
      ((t[1 + i * 2] = (r >> 8) & 255), (t[2 + i * 2] = r & 255));
    }),
    t.set(Rs(a.color), 21),
    t.set(Rs(a.color2), 24),
    a.noRecord ||
      ((t[27] = a.w),
      (t[28] = a.l),
      (t[29] = a.rank),
      (t[30] = a.teams),
      (t[31] = Math.max(0, os.indexOf(a.playoff))),
      (t[32] = (a.seed & 15) | (Math.min(5, Math.max(0, (o = a.allStars) != null ? o : 0)) << 4))));
  const s = new Uint8Array(t.length + 1);
  (s.set(t.slice(0, xe)), (s[xe] = e.length), s.set(e, xe + 1));
  let n = "";
  return (
    s.forEach((r) => (n += String.fromCharCode(r))),
    btoa(n).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
  );
}
function Wn(a) {
  try {
    if (!/^[A-Za-z0-9_-]+$/.test(a) || a.length > Bn) return null;
    const e = a.replace(/-/g, "+").replace(/_/g, "/"),
      t = atob(e + "=".repeat((4 - (e.length % 4)) % 4)),
      s = Uint8Array.from(t, (v) => v.charCodeAt(0));
    if (s.length < xe + 1 || s[0] !== Pa) return null;
    const n = s[xe];
    if (s.length !== xe + 1 + n) return null;
    Je != null || (Je = new Set(POKEMON_LIST.map((v) => v.dex)));
    const o = [];
    let r = !1;
    for (let v = 0; v < 10; v++) {
      const b = (s[1 + v * 2] << 8) | s[2 + v * 2];
      if (b === 0 && v >= 5) {
        r = !0;
        continue;
      }
      if (r || !Je.has(b)) return null;
      o.push(b);
    }
    if (new Set(o).size !== o.length) return null;
    const [i, l, c, h, d] = [s[27], s[28], s[29], s[30], s[31]],
      f = s[32] & 15,
      u = s[32] >> 4;
    if (u > 5) return null;
    const m = i === 0 && l === 0 && c === 0 && h === 0 && d === 0 && f === 0;
    if (
      !m &&
      (o.length !== 10 ||
        h < 2 ||
        h > 32 ||
        c < 1 ||
        c > h ||
        i + l < 1 ||
        i + l > 99 ||
        d >= os.length ||
        f > Math.min(4, h))
    )
      return null;
    const p = zt(new TextDecoder("utf-8", { fatal: !0 }).decode(s.slice(xe + 1)));
    return p
      ? {
          name: profanityFn(p, "Pallet Town"),
          color: Ds([...s.slice(21, 24)]),
          color2: Ds([...s.slice(24, 27)]),
          dex: o,
          w: i,
          l,
          rank: c,
          teams: h,
          seed: f,
          playoff: os[d],
          ...(m ? { noRecord: !0 } : {}),
          ...(u ? { allStars: u } : {}),
        }
      : null;
  } catch {
    return null;
  }
}
function ti(a) {
  const e = /^#s=([^&]*)$/.exec(a);
  return e ? Wn(e[1]) : null;
}
function jn(a, e = location) {
  return "".concat(e.origin).concat(e.pathname, "#s=").concat(Hn(a));
}
const qn = {
    PG: { pts: 1, reb: 0.8, ast: 2, stl: 2, blk: 1 },
    SG: { pts: 1.2, reb: 0.9, ast: 1.3, stl: 2, blk: 1.2 },
    SF: { pts: 1.1, reb: 1.3, ast: 1.2, stl: 2, blk: 1.8 },
    PF: { pts: 1, reb: 1.6, ast: 0.9, stl: 1.5, blk: 2.5 },
    C: { pts: 1, reb: 1.8, ast: 0.8, stl: 1.2, blk: 3 },
  },
  Ns = (a, e) => {
    const t = qn[e];
    return a.ppg * t.pts + a.rpg * t.reb + a.apg * t.ast + a.spg * t.stl + a.bpg * t.blk;
  };
function Un(a) {
  let e = a >>> 0;
  return () => {
    e = (e + 1831565813) >>> 0;
    let t = e;
    return (
      (t = Math.imul(t ^ (t >>> 15), t | 1)),
      (t ^= t + Math.imul(t ^ (t >>> 7), t | 61)),
      ((t ^ (t >>> 14)) >>> 0) / 4294967296
    );
  };
}
const mt = (a) => (a.length ? a.reduce((e, t) => e + t, 0) / a.length : 0);
function _n(a) {
  var l;
  const { starters: e, bench: t } = ye(a.roster),
    s = ((l = a.boost) != null ? l : 0) + Ot(e),
    n = (mt(t.map((c) => c.ovr)) - 60) * 0.08,
    o = mt(e.map((c) => c.r.sht * 0.3 + c.r.ins * 0.25 + c.r.spd * 0.15 + c.r.pas * 0.15 + c.r.hnd * 0.15)) + s + n,
    r = mt(e.map((c) => c.r.def * 0.3 + c.r.blk * 0.25 + c.r.reb * 0.25 + c.r.spd * 0.2)) + s + n,
    i = Math.round(mt(e.map((c) => c.ovr)) + s);
  return { off: o, def: r, power: o + r, ovr: i, starters: e, bench: t };
}
function zs(a, e, t, s) {
  const n = () => Math.sqrt(-2 * Math.log(1 - a())) * Math.cos(2 * Math.PI * a());
  let r = 64 + (e.off - 74) * 0.8 - (t.def - 74) * 0.55 + 1.8 + n() * 7,
    i = 64 + (t.off - 74) * 0.8 - (e.def - 74) * 0.55 + 0 + n() * 7;
  if (((r = Math.max(30, Math.round(r))), (i = Math.max(30, Math.round(i))), r === i)) {
    const l = 1 / (1 + Math.exp((t.power - e.power) / 12));
    a() < l ? (r += 1 + Math.floor(a() * 3)) : (i += 1 + Math.floor(a() * 3));
  }
  return [r, i];
}
function Kn(a) {
  const e = Array.from({ length: a }, (s, n) => n),
    t = [];
  for (let s = 0; s < a - 1; s++) {
    const n = [];
    for (let o = 0; o < a / 2; o++) n.push([e[o], e[a - 1 - o]]);
    (t.push(n), e.splice(1, 0, e.pop()));
  }
  return t;
}
function Qe(a, e, t) {
  const s = e.map((o) => t(o) * (a.starters.includes(o) ? 30 : 10)),
    n = s.reduce((o, r) => o + r, 0) || 1;
  return s.map((o) => o / n);
}
function si(a) {
  const { teams: e } = a,
    t = e.length;
  if (t < 4 || t % 2) throw new Error("A season needs an even number of teams, ENGINE_VERSION least 4");
  const s = Un(a.seed),
    n = e.map(_n),
    o = e.map((g, E) => ({ team: E, name: g.name, abbr: g.abbr, color: g.color, w: 0, l: 0, pf: 0, makeEmptyStats: 0, rank: 0 })),
    r = Kn(t),
    i = [],
    l = e[0].roster,
    c = n[0],
    h = e.map((g, E) => {
      const C = n[E],
        G = g.roster;
      return {
        tot: G.map(() => ({ pts: 0, reb: 0, ast: 0, stl: 0, blk: 0 })),
        pts: Qe(C, G, (I) => (I.r.sht * 0.3 + I.r.ins * 0.3 + I.r.spd * 0.1 + I.r.hnd * 0.15 + I.r.pas * 0.15) ** 2),
        reb: Qe(C, G, (I) => I.r.reb ** 2.5),
        ast: Qe(C, G, (I) => (I.r.pas * 0.6 + I.r.hnd * 0.4) ** 3),
        stl: Qe(C, G, (I) => (I.r.def * 0.5 + I.r.spd * 0.5) ** 3),
        blk: Qe(C, G, (I) => I.r.blk ** 4),
        gp: 0,
      };
    }),
    d = (g, E) => {
      const C = h[g],
        G = n[g].def,
        I = Math.round(E * 0.28),
        M = Math.round(34 + (G - 74) * 0.25);
      (C.gp++,
        C.tot.forEach((O, _) => {
          ((O.pts += E * C.pts[_]),
            (O.reb += M * C.reb[_]),
            (O.ast += I * C.ast[_]),
            (O.stl += (6 + (G - 74) * 0.08) * C.stl[_]),
            (O.blk += (4 + (G - 74) * 0.06) * C.blk[_]));
        }));
    },
    f = h[0].tot;
  for (let g = 0; g < 2; g++)
    for (let E = 0; E < r.length; E++) {
      const C = g * r.length + E + 1;
      for (const [G, I] of r[E]) {
        const [M, O] = g ? [I, G] : [G, I],
          [_, te] = zs(s, n[M], n[O]);
        if (
          ((o[M].pf += _),
          (o[M].makeEmptyStats += te),
          (o[O].pf += te),
          (o[O].makeEmptyStats += _),
          o[_ > te ? M : O].w++,
          o[_ > te ? O : M].l++,
          d(M, _),
          d(O, te),
          M === 0 || O === 0)
        ) {
          const j = M === 0,
            be = j ? _ : te,
            pe = j ? te : _;
          i.push({ week: C, opp: j ? O : M, home: j, pf: be, makeEmptyStats: pe, win: be > pe });
        }
      }
    }
  const u = [...o].sort((g, E) => E.w - g.w || E.pf - E.makeEmptyStats - (g.pf - g.makeEmptyStats) || g.name.localeCompare(E.name));
  u.forEach((g, E) => (g.rank = E + 1));
  const m = [],
    p = (g, E, C) => {
      const [G, I] = zs(s, n[E], n[C]),
        M = G > I ? E : C;
      return (m.push({ round: g, a: E, b: C, HEIGHT_WEIGHT: G, sb: I, winner: M }), M);
    },
    y = u.slice(0, 4).map((g) => g.team),
    v = p("semi", y[0], y[3]),
    b = p("semi", y[1], y[2]),
    k = p("final", v, b),
    w = o[0],
    P = y.indexOf(0) + 1,
    S = k === 0 ? "champion" : P === 0 ? "missed" : [v, b].includes(0) ? "final" : "semis",
    $ = i.length,
    D = l
      .map((g, E) => ({
        dex: g.dex,
        name: g.name,
        pos: g.pos,
        ovr: g.ovr,
        starter: c.starters.includes(g),
        ppg: f[E].pts / $,
        rpg: f[E].reb / $,
        apg: f[E].ast / $,
        spg: f[E].stl / $,
        bpg: f[E].blk / $,
      }))
      .map((g) => ({ ...g, ppg: de(g.ppg), rpg: de(g.rpg), apg: de(g.apg), spg: de(g.spg), bpg: de(g.bpg) })),
    R = (g) => g.ppg + g.rpg * 1.2 + g.apg * 1.5 + g.spg * 2 + g.bpg * 2;
  let A = 0;
  D.forEach((g, E) => {
    R(g) > R(D[A]) && (A = E);
  });
  const K = e.flatMap((g, E) => {
      const C = h[E].gp || 1,
        G = ye(g.roster);
      return g.roster.map((I, M) => {
        const O = h[E].tot[M],
          _ = G.starters.indexOf(I);
        return {
          dex: I.dex,
          name: I.name,
          pos: I.pos,
          ovr: I.ovr,
          starter: _ >= 0,
          team: E,
          started: _ >= 0 ? G.slots[_] : void 0,
          ppg: de(O.pts / C),
          rpg: de(O.reb / C),
          apg: de(O.ast / C),
          spg: de(O.stl / C),
          bpg: de(O.blk / C),
        };
      });
    }),
    Y = new Set(),
    J = POSITION_ORDER.flatMap((g) => {
      const E = K.filter((M) => (M.pos === g || M.started === g) && !Y.has("".concat(M.team, ":").concat(M.dex)));
      E.sort((M, O) => Ns(O, g) - Ns(M, g) || o[O.team].w - o[M.team].w || O.ovr - M.ovr || M.dex - O.dex);
      const C = E[0];
      if (!C) return [];
      Y.add("".concat(C.team, ":").concat(C.dex));
      const { started: G, ...I } = C;
      return [{ ...I, slot: g, teamName: e[C.team].name, color: e[C.team].color }];
    });
  return {
    seed: a.seed,
    weeks: i,
    standings: u,
    playoffs: m,
    user: {
      w: w.w,
      l: w.l,
      rank: w.rank,
      teams: t,
      seed: P,
      playoff: S,
      ppg: de(w.pf / $),
      oppg: de(w.makeEmptyStats / $),
      ...Nt(c.starters.concat(c.bench)),
    },
    players: D,
    pots: A,
    allStars: J,
  };
}
const de = (a) => Math.round(a * 10) / 10,
  Vn = {
    champion: "League Champions",
    final: "Lost in the Final",
    semis: "Lost in the Semifinals",
    missed: "Missed the Playoffs",
  },
  W = 1080;
function rs(a) {
  return new Promise((e) => {
    const t = new Image();
    ((t.onload = () => e(t)), (t.onerror = () => e(null)), (t.src = a));
  });
}
const Yn = (a) =>
  "".concat(a).concat(["th", "st", "nd", "rd"][a % 100 > 10 && a % 100 < 14 ? 0 : a % 10 < 4 ? a % 10 : 0]);
function xa(a, e, t, s, n) {
  let o = s;
  do a.font = "800 ".concat(o, "px ").concat(n);
  while (a.measureText(e).width > t && (o -= 4) > 24);
  return o;
}
async function Jn(a) {
  const e = document.createElement("canvas");
  ((e.width = W), (e.height = W));
  const t = e.getContext("2d"),
    s = "'Barlow Condensed', 'Arial Narrow', system-ui, sans-serif",
    n = "'Press Start 2P', ui-monospace, monospace",
    { grade: o } = Nt(a.dex.map((m) => getPokemon(m))),
    r = t.createLinearGradient(0, 0, W, W);
  (r.addColorStop(0, a.color2),
    r.addColorStop(0.55, "#0a0d1f"),
    r.addColorStop(1, "#0a0d1f"),
    (t.fillStyle = r),
    t.fillRect(0, 0, W, W),
    (t.fillStyle = a.color),
    t.fillRect(0, 0, W, 18),
    t.fillRect(0, W - 18, W, 18),
    (t.textBaseline = "alphabetic"),
    (t.fillStyle = "#ffcb05"),
    (t.font = "30px ".concat(n)),
    t.fillText("POKé JAM", 56, 100),
    (t.fillStyle = "#9aa0c8"),
    (t.font = "700 34px ".concat(s)),
    (t.textAlign = "right"),
    t.fillText("SEASON DRAFT", W - 56, 98),
    (t.textAlign = "left"),
    (t.fillStyle = "#f2f0e6"),
    (t.font = "800 ".concat(xa(t, a.name.toUpperCase(), W - 112, 120, "".concat(s)), "px ").concat(s)),
    t.fillText(a.name.toUpperCase(), 56, 220));
  const i = ye(a.dex.map((m) => getPokemon(m))),
    l = [...i.starters, ...i.bench].map((m) => m.dex),
    c = await Promise.all(l.map((m) => rs(le(m)))),
    h = 176,
    d = 20,
    f = (W - (5 * h + 4 * d)) / 2;
  c.forEach((m, p) => {
    const y = f + (p % 5) * (h + d),
      v = 260 + Math.floor(p / 5) * (h + d);
    ((t.fillStyle = "rgba(255,255,255,0.07)"),
      (t.strokeStyle = a.color),
      (t.lineWidth = 3),
      t.beginPath(),
      t.roundRect(y, v, h, h, 18),
      t.fill(),
      t.stroke(),
      m && ((t.imageSmoothingEnabled = !1), t.drawImage(m, y + 14, v + 4, h - 28, h - 28)),
      (t.fillStyle = "#f2f0e6"),
      (t.font = "700 22px ".concat(s)),
      (t.textAlign = "center"),
      t.fillText(getPokemon(l[p]).name.toUpperCase(), y + h / 2, v + h - 8, h - 12),
      (t.textAlign = "left"));
  });
  const u = 260 + 2 * h + d + 50;
  return (
    (t.fillStyle = "#ffcb05"),
    (t.font = "120px ".concat(n)),
    t.fillText("".concat(a.w, "-").concat(a.l), 56, u + 100),
    (t.fillStyle = "#f2f0e6"),
    (t.font = "800 52px ".concat(s)),
    t.fillText(
      ""
        .concat(Yn(a.rank), " of ")
        .concat(a.teams)
        .concat(a.seed ? " · #".concat(a.seed, " seed") : ""),
      56,
      u + 170,
    ),
    (t.fillStyle = a.playoff === "champion" ? "#ffcb05" : "#9aa0c8"),
    (t.font = "800 52px ".concat(s)),
    t.fillText(Vn[a.playoff].toUpperCase(), 56, u + 230),
    a.allStars &&
      ((t.fillStyle = "#ffcb05"),
      (t.font = "800 46px ".concat(s)),
      t.fillText("★ ".concat(a.allStars, " ALL-STAR").concat(a.allStars > 1 ? "S" : ""), 56, u + 290)),
    (t.fillStyle = a.color),
    t.beginPath(),
    t.roundRect(W - 56 - 250, u + 10, 250, 250, 28),
    t.fill(),
    (t.fillStyle = "#fff"),
    (t.textAlign = "center"),
    (t.font = "700 34px ".concat(s)),
    t.fillText("DRAFT GRADE", W - 56 - 125, u + 60),
    (t.font = "110px ".concat(n)),
    t.fillText(o, W - 56 - 125, u + 200),
    (t.fillStyle = "#9aa0c8"),
    (t.font = "700 34px ".concat(s)),
    t.fillText("pokejam.xyz", W / 2, W - 44),
    (t.textAlign = "left"),
    e
  );
}
const Qn = { PG: [0.5, 0.8], SG: [0.83, 0.55], SF: [0.17, 0.55], PF: [0.68, 0.24], C: [0.32, 0.24] };
async function Ma(a) {
  const e = document.createElement("canvas");
  ((e.width = W), (e.height = W));
  const t = e.getContext("2d"),
    s = "'Barlow Condensed', 'Arial Narrow', system-ui, sans-serif",
    n = "'Press Start 2P', ui-monospace, monospace",
    o = a.dex.map((S) => getPokemon(S)),
    { starters: r, bench: i, slots: l } = ye(o),
    { grade: c, ovr: h } = Nt(o),
    [d, f] = await Promise.all([Promise.all(r.map((S) => rs(le(S.dex)))), Promise.all(i.map((S) => rs(le(S.dex))))]),
    u = t.createLinearGradient(0, 0, W, W);
  (u.addColorStop(0, a.color2),
    u.addColorStop(0.6, "#0a0d1f"),
    u.addColorStop(1, "#0a0d1f"),
    (t.fillStyle = u),
    t.fillRect(0, 0, W, W),
    (t.fillStyle = a.color),
    t.fillRect(0, 0, W, 18),
    t.fillRect(0, W - 18, W, 18),
    (t.fillStyle = "#ffcb05"),
    (t.font = "30px ".concat(n)),
    t.fillText("POKé JAM", 56, 92),
    (t.fillStyle = "#9aa0c8"),
    (t.font = "700 34px ".concat(s)),
    (t.textAlign = "right"),
    t.fillText("DRAFT COMPLETE", W - 56, 90),
    (t.textAlign = "left"));
  const m = a.name.toUpperCase();
  ((t.font = "800 ".concat(xa(t, m, W - 112 - 300, 104, s), "px ").concat(s)),
    (t.lineWidth = 8),
    (t.strokeStyle = "rgba(0,0,0,0.55)"),
    t.strokeText(m, 56, 196),
    (t.fillStyle = a.color),
    t.fillText(m, 56, 196));
  const p = W - 56 - 280;
  ((t.fillStyle = a.color),
    t.beginPath(),
    t.roundRect(p, 118, 132, 132, 20),
    t.fill(),
    (t.fillStyle = "rgba(255,255,255,0.08)"),
    t.beginPath(),
    t.roundRect(p + 148, 118, 132, 132, 20),
    t.fill(),
    (t.fillStyle = "#fff"),
    (t.textAlign = "center"),
    (t.font = "700 24px ".concat(s)),
    t.fillText("GRADE", p + 66, 152),
    t.fillText("TEAM OVR", p + 214, 152),
    (t.font = "52px ".concat(n)),
    t.fillText(c, p + 66, 226),
    (t.fillStyle = "#ffcb05"),
    t.fillText(String(h), p + 214, 226),
    (t.textAlign = "left"));
  const y = 110,
    v = 280,
    b = W - 220,
    k = i.length ? 520 : 640,
    w = t.createLinearGradient(0, v, 0, v + k);
  (w.addColorStop(0, "#c99a5b"),
    w.addColorStop(1, "#a87a42"),
    (t.fillStyle = w),
    t.beginPath(),
    t.roundRect(y, v, b, k, 22),
    t.fill(),
    (t.strokeStyle = "rgba(255,255,255,0.75)"),
    (t.lineWidth = 5),
    t.stroke(),
    t.beginPath(),
    t.rect(y + b / 2 - 110, v, 220, k * 0.42),
    t.stroke(),
    t.beginPath(),
    t.arc(y + b / 2, v + 20, b * 0.4, 0.08 * Math.PI, 0.92 * Math.PI),
    t.stroke(),
    (t.imageSmoothingEnabled = !1));
  const P = 150;
  if (
    (r.forEach((S, $) => {
      const [D, R] = Qn[l[$]],
        A = y + D * b,
        K = v + R * k;
      ((t.fillStyle = "rgba(0,0,0,0.25)"),
        t.beginPath(),
        t.ellipse(A, K + P * 0.42, P * 0.36, 14, 0, 0, Math.PI * 2),
        t.fill());
      const Y = d[$];
      (Y && t.drawImage(Y, A - P / 2, K - P / 2, P, P),
        (t.fillStyle = a.color),
        t.beginPath(),
        t.roundRect(A - 34, K + P / 2 - 4, 68, 34, 8),
        t.fill(),
        (t.fillStyle = "#fff"),
        (t.textAlign = "center"),
        (t.font = "800 26px ".concat(s)),
        t.fillText(l[$], A, K + P / 2 + 22),
        (t.font = "800 26px ".concat(s)),
        (t.lineWidth = 5),
        (t.strokeStyle = "rgba(0,0,0,0.6)"));
      const J = S.name.toUpperCase();
      (t.strokeText(J, A, K + P / 2 + 58, 220), t.fillText(J, A, K + P / 2 + 58, 220), (t.textAlign = "left"));
    }),
    i.length)
  ) {
    const S = v + k + 30;
    ((t.fillStyle = "#9aa0c8"), (t.font = "700 28px ".concat(s)), t.fillText("BENCH", 56, S + 24));
    const $ = 132,
      D = 18,
      R = (W - (i.length * $ + (i.length - 1) * D)) / 2;
    i.forEach((A, K) => {
      const Y = R + K * ($ + D),
        J = S + 36;
      ((t.fillStyle = "rgba(255,255,255,0.07)"),
        (t.strokeStyle = "rgba(255,255,255,0.18)"),
        (t.lineWidth = 2),
        t.beginPath(),
        t.roundRect(Y, J, $, $, 14),
        t.fill(),
        t.stroke());
      const g = f[K];
      (g && t.drawImage(g, Y + 10, J + 2, $ - 20, $ - 20),
        (t.fillStyle = "#c9cce6"),
        (t.font = "700 20px ".concat(s)),
        (t.textAlign = "center"),
        t.fillText("".concat(A.pos, " · ").concat(A.name.toUpperCase()), Y + $ / 2, J + $ - 8, $ - 10),
        (t.textAlign = "left"));
    });
  }
  return (
    (t.fillStyle = "#9aa0c8"),
    (t.font = "700 34px ".concat(s)),
    (t.textAlign = "center"),
    t.fillText("pokejam.xyz", W / 2, W - 40),
    (t.textAlign = "left"),
    e
  );
}
const ai = (a) => (a.noRecord ? Ma(a) : Jn(a)),
  Ta = (a) => new Promise((e) => a.toBlob(e, "image/png"));
function Xn(a) {
  return "pokejam-".concat(
    a.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "team",
    ".png",
  );
}
function Zn(a, e) {
  const { grade: t, ovr: s } = Nt(a.dex.map((n) => getPokemon(n)));
  return a.noRecord
    ? "My PokeJam draft: ".concat(a.name, ", grade ").concat(t, ", ").concat(s, " OVR ").concat(e)
    : "My PokeJam team went ".concat(a.w, "-").concat(a.l, ", grade ").concat(t, " ").concat(e);
}
const eo = (a) => Ta(a);
async function to(a, e, t, s) {
  const n = Xn(t),
    o = Zn(t, s);
  if (e && typeof File != "undefined" && navigator.canShare && navigator.share) {
    const r = new File([e], n, { type: "image/png" });
    if (navigator.canShare({ files: [r], text: o }))
      try {
        return (await navigator.share({ files: [r], title: "Poké Jam", text: o }), "shared");
      } catch (i) {
        if (i.name === "AbortError") return "cancelled";
      }
  }
  return "saved";
}
async function so(a, e, t) {
  const s = t != null ? t : await Ta(a),
    n = document.createElement("a");
  ((n.download = e),
    (n.href = s ? URL.createObjectURL(s) : a.toDataURL("image/png")),
    document.body.appendChild(n),
    n.click(),
    n.remove(),
    s && setTimeout(() => URL.revokeObjectURL(n.href), 4e3));
}
function ao(a) {
  const e = document.createElement("div");
  ((e.className = "ss-preview"),
    e.setAttribute("role", "dialog"),
    e.setAttribute("aria-label", "Share card"),
    (e.innerHTML = '<img src="'.concat(a, '" alt="Your share card"><p class="note">Tap anywhere to close</p>')));
  const t = () => {
      (e.remove(), window.removeEventListener("keydown", s));
    },
    s = (n) => {
      n.key === "Escape" && t();
    };
  (e.addEventListener("click", t), window.addEventListener("keydown", s), document.body.appendChild(e));
}
const no = (a, e, t, s) => ({
  name: a,
  color: e,
  color2: t,
  dex: s.map((n) => n.dex),
  w: 0,
  l: 0,
  rank: 0,
  teams: 0,
  seed: 0,
  playoff: "missed",
  noRecord: !0,
});
function oo(a, e, t) {
  var f;
  const s = a.querySelector('[data-a="preview-draft"]'),
    n = a.querySelector(".sum-share-status");
  if (!s || !n) return;
  const o = () => {
    var b, k;
    const u = teamNameClean(
        (k = (b = a.querySelector("#sum-name")) == null ? void 0 : b.dataset.en || b.textContent) != null ? k : "",
      ),
      m = u && !DRILL_TABLE(u) ? u : t.name,
      p = a.querySelector(".sw.on"),
      [y, v] = p ? $t[Number(p.dataset.sw)] : [t.color, t.color2];
    return no(m, y, v, e);
  };
  let r = o(),
    i = null,
    l = "";
  const c = () => {
    ((r = o()), (l = ""), (s.innerHTML = '<span class="ss-thumb-ph">Drawing…</span>'));
    const u = (i = Ma(r).then(async (m) => ({ canvas: m, blob: await eo(m) })));
    u.then(({ canvas: m }) => {
      i === u && ((l = m.toDataURL("image/png")), (s.innerHTML = '<img src="'.concat(l, '" alt="Your share card">')));
    }).catch(() => {
      i === u && ((i = null), (s.hidden = !0));
    });
  };
  let h = 0;
  const d = () => {
    (window.clearTimeout(h), (h = window.setTimeout(c, 350)));
  };
  ((f = a.querySelector("#sum-name")) == null ||
    f.addEventListener("click", () => {
      const zs = [
          "Pallet Stars",
          "Boulder Bulls",
          "Cascade Waves",
          "Thunder Bolts",
          "Rainbow Wings",
          "Ninja Squad",
          "Mind Masters",
          "Volcano Blaze",
          "Quake Giants",
          "Indigo Kings",
          "Pikachu United",
          "Dragon Aces",
        ],
        zi = Number(f.dataset.zi || -1),
        D = zs[(zi + 1) % zs.length];
      ((f.dataset.zi = String((zi + 1) % zs.length)), (f.dataset.en = D), (f.textContent = D), d());
    }),
    a.addEventListener("click", async (u) => {
      const m = u.target;
      if (m.closest("[data-sw]")) return void window.setTimeout(c, 0);
      if (m.closest('[data-a="preview-draft"]')) {
        l && ao(l);
        return;
      }
    }),
    c());
}
const ro = 7,
  io = 8,
  lo = 3;
function Ce(a, e, t = [], s = Math.random) {
  var d;
  const n = (f) => f.types.some((u) => t.includes(u)),
    o = t.length > 0 && !e.some(n),
    r = (f) => e.filter((u) => u.pos === f).length,
    i = Math.max(...a.map((f) => f.ovr)) - ro;
  let l = a.filter((f) => f.ovr >= i);
  if (o && e.length >= lo - 1) {
    const f = l.filter(n);
    f.length && (l = f);
  }
  let c = (d = l[0]) != null ? d : a[0],
    h = -1 / 0;
  for (const f of l) {
    const u = [5, 2, 0][Math.min(2, r(f.pos))],
      m = f.ovr + u + (o && n(f) ? io : 0) + s() * 9;
    m > h && ((h = m), (c = f));
  }
  return c;
}
function co(a, e) {
  const t = Object.keys(STAT_LABELS)
    .map((s) => {
      const n = a.r[s];
      return '<div class="rt"><span>'
        .concat(STAT_LABELS[s], '</span><b class="t-')
        .concat(storageRead(n), '">')
        .concat(n, '</b><i style="--v:')
        .concat(n, '%"></i></div>');
    })
    .join("");
  return '\n    <div class="detail-top t-'
    .concat(storageRead(a.ovr), '">\n      <img src="')
    .concat(le(a.dex), '" alt="">\n      <div>\n        <div class="detail-ovr">')
    .concat(a.ovr, "<small>OVR</small></div>\n        <h3>")
    .concat(escapeHtml(a.name), '</h3>\n        <p class="arch">')
    .concat(a.pos, " · ")
    .concat(a.archetype, '</p>\n        <span class="types">')
    .concat(wa(a), '</span>\n      </div>\n    </div>\n    <div class="ratings">')
    .concat(t, '</div>\n    <div class="special-box">\n      <span class="lbl">Special: ')
    .concat(a.move, "</span>\n      <p>")
    .concat(SPECIAL_EFFECTS[a.special].label, ". ")
    .concat(SPECIAL_EFFECTS[a.special].desc, "</p>\n    </div>\n    ")
    .concat(
      e === null
        ? ""
        : '<button class="btn primary big pick" '
            .concat(e ? "" : "disabled", ">")
            .concat(e ? "Draft ".concat(escapeHtml(a.name)) : "Waiting for your pick", "</button>"),
    );
}
const Et = (a) => Rt(ye(a).starters);
function Bs(a, e, t, s = "") {
  const { starters: n } = ye(e),
    o = Array.from({ length: t }, (i, l) => {
      const c = e[l],
        h = t > 5 && c ? "<small>".concat(n.includes(c) ? "Starter" : "Bench", "</small>") : "";
      return c
        ? '<li><img src="'
            .concat(le(c.dex), '" alt=""><span class="nm">')
            .concat(escapeHtml(c.name))
            .concat(h, '</span><span class="pos">')
            .concat(c.pos, '</span><b class="t-')
            .concat(storageRead(c.ovr), '">')
            .concat(c.ovr, "</b></li>")
        : '<li class="empty"><span>Pick '.concat(l + 1).concat(t > 5 && l >= 5 ? " (bench)" : "", "</span></li>");
    }).join(""),
    r = e.length >= 5 && Ot(n) ? '<span class="chem">+2 Balanced lineup</span>' : "";
  return '<div class="roster you"><h4>'
    .concat(escapeHtml(a.name), ' <span class="tovr">')
    .concat(e.length ? Et(e) : "--")
    .concat(s, "</span>")
    .concat(r, "</h4>")
    .concat($a(e, t), '<p class="pos-note">')
    .concat(fo(e, t), "</p><ul>")
    .concat(o, "</ul></div>");
}
function Hs(a, e, t) {
  const s = a
    .map((n, o) =>
      n.human
        ? ""
        : '\n    <li style="--tc:'
            .concat(n.color, '" title="')
            .concat(escapeHtml(n.name))
            .concat(n.leader ? " (".concat(escapeHtml(n.leader), ")") : "", '">\n      <span class="abbr">')
            .concat(escapeHtml(n.abbr), "</span>\n      ")
            .concat(
              Array.from({ length: t }, (r, i) =>
                e[o][i]
                  ? '<img src="'
                      .concat(le(e[o][i].dex), '" alt="')
                      .concat(escapeHtml(e[o][i].name), '" title="')
                      .concat(escapeHtml(e[o][i].name), " (")
                      .concat(e[o][i].ovr, ')">')
                  : "<i></i>",
              ).join(""),
              "\n    </li>",
            ),
    )
    .join("");
  return '<div class="board '
    .concat(t > 5 ? "many" : "", '" style="--slots:')
    .concat(t, '"><h4>League board</h4><ul>')
    .concat(s, "</ul></div>");
}
const jt = 60,
  bs = (a) => (a > 5 ? 2 : 1),
  Ft = (a, e) => a.filter((t) => t.pos === e).length,
  ho = (a) => POSITION_ORDER.filter((e) => !Ft(a, e)),
  uo = (a, e) => POSITION_ORDER.filter((t) => Ft(a, t) > 0 && Ft(a, t) < bs(e));
function $a(a, e, t = !1) {
  const s = bs(e);
  return '<ul class="pos-track '.concat(t ? "compact" : "", '">').concat(
    POSITION_ORDER
      .map((n) => {
        const o = a.filter((l) => l.pos === n),
          r = o.length === 0 ? "need" : o.length < s ? "thin" : "ok",
          i = o.length === 0 ? "Need" : o.length < s ? "Backup" : "✓";
        return '<li class="'
          .concat(r, '" title="')
          .concat(n, ": ")
          .concat(o.map((l) => l.name).join(", ") || "none yet", '">\n      <b>')
          .concat(n, "</b><span>")
          .concat(o.length, "/")
          .concat(s, "</span>")
          .concat(
            t
              ? ""
              : "<small>"
                  .concat(i, '</small>\n      <span class="who">')
                  .concat(
                    o.map((l) => '<img src="'.concat(le(l.dex), '" alt="').concat(escapeHtml(l.name), '">')).join(""),
                    "</span>",
                  ),
            "\n    </li>",
          );
      })
      .join(""),
    "</ul>",
  );
}
function fo(a, e) {
  const t = e - a.length;
  if (!t) return "Roster full.";
  const s = ho(a),
    n = uo(a, e);
  if (s.length) {
    const o = s.length >= t ? ' <b class="warn">Draft them now: you are running out of picks.</b>' : "";
    return "Still need a starter ENGINE_VERSION <b>".concat(s.join(", "), "</b>.").concat(o);
  }
  return n.length
    ? "Starting five covered. Backups wanted ENGINE_VERSION <b>".concat(n.join(", "), "</b>.")
    : e > 5
      ? "Every position has a starter and a backup. Take the best Pokémon left."
      : "All five positions covered.";
}
function mo(a, e, t = "") {
  const s = Array.from({ length: e }, (n, o) =>
    a[o]
      ? '<img class="t-'
          .concat(storageRead(a[o].ovr), '" src="')
          .concat(le(a[o].dex), '" alt="')
          .concat(escapeHtml(a[o].name), '" title="')
          .concat(escapeHtml(a[o].name), " (")
          .concat(a[o].ovr, ')">')
      : "<i></i>",
  ).join("");
  return '\n    <span class="tbar-ovr"><small>Team OVR</small><b>'
    .concat(a.length ? Et(a) : "--", "</b>")
    .concat(t, '</span>\n    <span class="tbar-slots ')
    .concat(e > 5 ? "many" : "", '" style="--slots:')
    .concat(e, '"><span class="tbar-lbl">My team <b>')
    .concat(a.length, "/")
    .concat(e, "</b></span>")
    .concat(s, '</span>\n    <span class="tbar-need"><span class="clock" hidden></span></span>\n    ')
    .concat($a(a, e, !0));
}
function ni(a, e, t, s, n, o, r = {}) {
  var Ke, Ve;
  const { teams: i, order: l } = e,
    c = a;
  ((a = document.createElement("div")), c.replaceChildren(a));
  const h = [...POKEMON_LIST].sort((F, x) => x.ovr - F.ovr),
    d = i.map(() => []),
    f = (Ke = e.rounds) != null ? Ke : 5,
    u = Ln(l, f),
    m = i.findIndex((F) => F.human);
  let p = 0,
    y = "ALL",
    v = "",
    b = null;
  const k = ["Draft order: ".concat(l.map((F) => (i[F].human ? "You" : i[F].abbr)).join(", "))];
  let w = 0,
    P = !1,
    S = !1,
    $ = jt * 1e3,
    D = -1,
    R = performance.now(),
    A = 0,
    K = !1,
    Y = 0,
    J = 0,
    g = 0,
    E = "",
    C = !1;
  a.innerHTML =
    '\n    <div class="draft">\n      <header class="draft-head">\n        <button class="btn ghost small" data-a="back">Menu</button>\n        <div class="status"><span class="round"></span><span class="otc"></span><span class="clock big" hidden></span><span class="myspot"></span></div>\n        <div class="head-actions">\n          <button class="btn small" data-a="auto">Auto-pick</button>\n          <button class="btn small" data-a="sim">Sim rest</button>\n        </div>\n      </header>\n      <div class="draft-body">\n        <section class="pool">\n          <div class="filters" role="tablist">\n            '
      .concat(
        ["ALL", ...POSITION_ORDER]
          .map((F) =>
            '<button data-f="'
              .concat(F, '" class="')
              .concat(F === "ALL" ? "on" : "", '">')
              .concat(F)
              .concat(F === "ALL" ? "" : "<small></small>", "</button>"),
          )
          .join(""),
        '\n            <select id="type-filter" aria-label="Filter by type">\n              <option value="">All types</option>\n              ',
      )
      .concat(
        Object.keys(TYPE_COLORS)
          .map((F) => '<option value="'.concat(F, '">').concat(F, "</option>"))
          .join(""),
        '\n            </select>\n          </div>\n          <div class="grid"></div>\n        </section>\n        <aside class="side">\n          <div class="detail" hidden></div>\n          <div class="rosters"></div>\n          <ol class="log"></ol>\n        </aside>\n      </div>\n      <button class="tbar" data-a="team" aria-label="Show my team"></button>\n      <div class="summary-host"></div>\n      <div class="sheet-bg team-sheet" hidden>\n        <div class="sheet" role="dialog" aria-label="My team">\n          <button class="close" data-a="team-close" aria-label="Close">×</button>\n          <div class="team-sheet-body"></div>\n        </div>\n      </div>\n    </div>',
      );
  const G = (F) => a.querySelector(F),
    I = G(".grid"),
    M = G(".detail");
  G("#type-filter").addEventListener("change", (F) => {
    ((v = F.target.value), j());
  });
  const O = () => !S && u[p] === m,
    _ = l.indexOf(m) + 1;
  G(".myspot").innerHTML = "Your spot: <b>".concat(Wt(_), "</b>");
  const te = () => {
      P = !0;
      const x = u
          .map((q, se) => (q === m ? se + 1 : 0))
          .filter(Boolean)
          .slice(1, 3)
          .map(Wt)
          .join(", "),
        T = document.createElement("div");
      ((T.className = "spot-reveal"),
        T.setAttribute("role", "status"),
        (T.innerHTML =
          '<div class="spot-card">\n      <p class="spot-kicker">Draft order is set</p>\n      <h2>You pick <b>'
            .concat(Wt(_), "</b> of ")
            .concat(i.length, '</h2>\n      <p class="spot-snake">Snake draft')
            .concat(x ? " · then ".concat(x, "…") : "", '</p>\n      <ol class="spot-order">')
            .concat(
              l
                .map((q, se) =>
                  '<li class="'
                    .concat(q === m ? "POSITION_ORDER" : "", '" style="--tc:')
                    .concat(i[q].color, '"><small>')
                    .concat(se + 1, "</small>")
                    .concat(q === m ? "YOU" : escapeHtml(i[q].abbr), "</li>"),
                )
                .join(""),
              '</ol>\n      <p class="spot-tap">Tap to continue</p></div>',
            )),
        a.querySelector(".draft").append(T));
      const V = () => {
          P &&
            ((P = !1),
            window.clearTimeout(L),
            T.classList.add("out"),
            window.setTimeout(() => T.remove(), 250),
            O() && (($ = jt * 1e3), (D = p), (A = 0)),
            (R = performance.now()),
            pe());
        },
        L = window.setTimeout(V, 2200);
      T.addEventListener("click", (q) => {
        (q.stopPropagation(), V());
      });
    },
    j = () => {
      const F = Math.floor(p / i.length) + 1;
      G(".round").textContent = S
        ? "DRAFT COMPLETE"
        : "ROUND "
            .concat(F, " · PICK ")
            .concat(p + 1, " OF ")
            .concat(u.length);
      const x = G(".otc"),
        T = u.indexOf(m, p) - p;
      ((x.textContent = S
        ? ""
        : O()
          ? "You're on the clock"
          : "".concat(i[u[p]].name, " is picking… (you're up in ").concat(T, ")")),
        x.classList.toggle("you", O()));
      const V = h.filter((Q) => (y === "ALL" || Q.pos === y) && (!v || Q.types.includes(v))),
        L = "".concat(y, "|").concat(v),
        q = L !== E;
      ((E = L),
        (I.className = q ? "grid enter" : "grid"),
        (I.innerHTML = V.map((Q, fe) => On(Q, b === Q ? "sel" : "", q ? Math.min(fe, 24) : -1)).join("")));
      const se = d[m].length ? Et(d[m]) : 0,
        ne = performance.now();
      (Y > 0 && se > Y && ((J = se - Y), (g = ne)), (Y = se));
      const ae =
        J && ne - g < 1500
          ? '<span class="pop" style="animation-delay:-'.concat(Math.round(ne - g), 'ms">+').concat(J, "</span>")
          : "";
      ((G(".rosters").innerHTML = Bs(i[m], d[m], f, ae) + Hs(i, d, f)),
        (G(".log").innerHTML = k
          .slice(-6)
          .reverse()
          .map((Q) => "<li>".concat(escapeHtml(Q), "</li>"))
          .join("")),
        (G(".tbar").innerHTML = mo(d[m], f, ae)),
        a.querySelectorAll(".filters [data-f]").forEach((Q) => {
          const fe = Q.dataset.f;
          if (fe === "ALL") return;
          const Fe = Ft(d[m], fe);
          ((Q.querySelector("small").textContent = String(Fe)),
            Q.classList.toggle("need", Fe === 0),
            Q.classList.toggle("thin", Fe > 0 && Fe < bs(f)));
        }),
        pe());
      const oe = G(".team-sheet");
      ((oe.hidden = !K),
        K &&
          (G(".team-sheet-body").innerHTML =
            Bs(i[m], d[m], f, ae) +
            '<p class="note">Cover all five positions in your starting five for the +2 lineup bonus.'.concat(
              f > 5
                ? " Picks 6-10 are your bench: a backup ENGINE_VERSION every position keeps the rotation from playing out of position when starters tire."
                : "",
              "</p>",
            ) +
            Hs(i, d, f)),
        b
          ? ((M.hidden = !1), (M.innerHTML = '<button class="close" aria-label="Close">×</button>' + co(b, O())))
          : (M.hidden = !0),
        a.querySelectorAll('[data-a="auto"], [data-a="sim"]').forEach((Q) => (Q.disabled = S)));
    },
    be = () => a.querySelectorAll(".clock");
  function pe() {
    const F = O();
    F && D !== p && ((D = p), ($ = jt * 1e3), (A = 0));
    const x = Math.max(0, Math.ceil($ / 1e3));
    be().forEach((T) => {
      ((T.hidden = !F), (T.textContent = "0:".concat(String(x).padStart(2, "0"))), T.classList.toggle("low", x <= 10));
    });
  }
  const Ee = window.setInterval(() => {
      const F = performance.now(),
        x = F - R;
      if (((R = F), !a.isConnected || S)) {
        window.clearInterval(Ee);
        return;
      }
      if (!O() || document.hidden || P) return;
      $ -= Math.min(x, 1e3);
      const T = Math.ceil($ / 1e3);
      if ((T <= 5 && T > 0 && T !== A && ((A = T), t.blip(T <= 3)), $ <= 0)) {
        ve(Ce(h, d[m]), "Time's up! Auto-picked");
        return;
      }
      pe();
    }, 200),
    ge = (F, x) => {
      const T = u[p];
      (e.taken.push(F.dex),
        h.splice(h.indexOf(F), 1),
        d[T].push(F),
        k.push(
          ""
            .concat(x != null ? x : "".concat(i[T].human ? "You" : i[T].name, " selected"), " ")
            .concat(F.name, " (")
            .concat(F.pos, ", ")
            .concat(F.ovr, ")"),
        ),
        p++,
        b === F && (b = null));
    },
    De = () => {
      ((S = !0), (b = null), (K = !1), o(e), j(), lt());
    },
    lt = () => {
      var T;
      const F = i[m],
        x = d.map((V, L) => (L === m ? -1 : Et(V))).filter((V) => V >= 0);
      ((G(".summary-host").innerHTML = zn({
        teamName: F.name,
        color: F.color,
        color2: F.color2,
        picks: d[m],
        others: x,
        customize: r.customize !== !1,
      })),
        oo(G(".summary-host"), d[m], F),
        (T = a.querySelector('[data-a="continue"]')) == null || T.focus());
    },
    we = () => {
      if (C) return;
      const F = a.querySelector("#sum-name"),
        x = F ? teamNameClean(F.value) : "";
      if (DRILL_TABLE(x)) {
        (drillScore(F), F.focus());
        return;
      }
      C = !0;
      const T = i[m];
      x && ((T.name = x), (T.abbr = drillSpawn(x)));
      const V = a.querySelector(".sw.on");
      (V && ([T.color, T.color2] = $t[Number(V.dataset.sw)]), s(d, h));
    },
    ve = (F, x) => {
      const T = u[p] === m;
      if ((ge(F, x), t.blip(T), p >= u.length)) return De();
      (o(e), j(), _e());
    },
    _e = () => {
      (window.clearTimeout(w),
        !S && u[p] !== m && (w = window.setTimeout(() => ve(Ce(h, d[u[p]], i[u[p]].types)), 280)));
    };
  (a.addEventListener("click", (F) => {
    var se, ne, ae;
    const x = F.target,
      T = x.closest(".mon-card");
    if (T && I.contains(T)) {
      ((b = (se = h.find((oe) => oe.dex === Number(T.dataset.dex))) != null ? se : null), t.blip(), j());
      return;
    }
    const V = x.closest("[data-f]");
    if (V) {
      ((y = V.dataset.f), a.querySelectorAll("[data-f]").forEach((oe) => oe.classList.toggle("on", oe === V)), j());
      return;
    }
    if (x.closest('[data-a="team"]')) {
      ((K = !0), (b = null), j());
      return;
    }
    if (x.closest('[data-a="team-close"]') || x.classList.contains("team-sheet")) {
      ((K = !1), j());
      return;
    }
    if (x.closest(".close")) {
      ((b = null), j());
      return;
    }
    const L = x.closest("[data-sw]");
    if (L) {
      a.querySelectorAll(".sw").forEach((fe) => fe.classList.toggle("on", fe === L));
      const [oe, Q] = $t[Number(L.dataset.sw)];
      (ne = a.querySelector(".sum-bg")) == null || ne.setAttribute("style", "--tc:".concat(oe, ";--tc2:").concat(Q));
      return;
    }
    if (x.closest('[data-a="continue"]')) {
      we();
      return;
    }
    if (x.closest(".pick") && b && O()) {
      ve(b);
      return;
    }
    const q = (ae = x.closest("[data-a]")) == null ? void 0 : ae.dataset.a;
    if (
      (q === "back" && (window.clearTimeout(w), window.clearInterval(Ee), (S = !0), n()),
      q === "auto" && O() && ve(Ce(h, d[m])),
      q === "sim" && !S)
    ) {
      for (window.clearTimeout(w); p < u.length;) ge(Ce(h, d[u[p]], i[u[p]].types));
      De();
    }
  }),
    a.addEventListener("keydown", (F) => {
      F.key === "Enter" && F.target.id === "sum-name" && we();
    }));
  const Ne = e.taken.splice(0);
  for (const F of Ne) {
    if (p >= u.length) break;
    ge((Ve = h.find((x) => x.dex === F)) != null ? Ve : Ce(h, d[u[p]], i[u[p]].types));
  }
  if ((Ne.length && k.push("Draft resumed ENGINE_VERSION pick ".concat(p + 1, ".")), p >= u.length)) return De();
  (j(), Ne.length || te(), _e());
}
const Ws = {
  Boulder:
    '<polygon points="12,3 28,3 37,12 37,28 28,37 12,37 3,28 3,12" fill="#8d939c" stroke="#4b5058" stroke-width="2"/>\n    <polygon points="12,9 28,9 31,20 20,31 9,20" fill="#b9bec6"/>',
  Cascade:
    '<path d="M20 3 C20 3 7 19 7 26 a13 13 0 0 0 26 0 C33 19 20 3 20 3z" fill="#3fa9f5" stroke="#1b5f99" stroke-width="2"/>\n    <ellipse cx="15" cy="25" rx="3" ry="5" fill="#bfe6ff"/>',
  Thunder:
    '<polygon points="20,2 25,14 38,14 27,22 32,36 20,28 8,36 13,22 2,14 15,14" fill="#f6a623" stroke="#9a5d00" stroke-width="2"/>\n    <circle cx="20" cy="19" r="5" fill="#ffe27a"/>',
  Rainbow:
    '<circle cx="20" cy="11" r="8" fill="#e8483c"/><circle cx="29" cy="20" r="8" fill="#f5c518"/>\n    <circle cx="20" cy="29" r="8" fill="#43b05c"/><circle cx="11" cy="20" r="8" fill="#3b82f6"/><circle cx="20" cy="20" r="5" fill="#fff"/>',
  Soul: '<path d="M20 35 L5 20 a8 8 0 0 1 15-11 a8 8 0 0 1 15 11z" fill="#ec5fa1" stroke="#8f1f58" stroke-width="2"/>',
  Marsh:
    '<circle cx="14" cy="20" r="11" fill="#e2b93b" stroke="#8a6a0e" stroke-width="2"/>\n    <circle cx="26" cy="20" r="11" fill="#f3d36b" stroke="#8a6a0e" stroke-width="2"/>',
  Volcano:
    '<polygon points="20,2 33,20 20,38 7,20" fill="#e2452b" stroke="#7d1a0b" stroke-width="2"/>\n    <polygon points="20,12 26,20 20,29 14,20" fill="#ffb347"/>',
  Earth:
    '<path d="M20 3 C33 10 35 27 20 37 C5 27 7 10 20 3z" fill="#4fae4a" stroke="#1f5e1c" stroke-width="2"/>\n    <line x1="20" y1="9" x2="20" y2="33" stroke="#1f5e1c" stroke-width="2"/>',
  Elite:
    '<polygon points="4,30 7,10 14,20 20,6 26,20 33,10 36,30" fill="#e8b923" stroke="#7a5a00" stroke-width="2"/>\n    <rect x="4" y="30" width="32" height="6" fill="#c99a12" stroke="#7a5a00" stroke-width="2"/>\n    <circle cx="20" cy="22" r="3" fill="#e3350d"/>',
};
function po(a, e, t = 40) {
  var n;
  const s = (n = Ws[a]) != null ? n : Ws.Elite;
  return '<svg xmlns="http://www.w3.org/2000/svg" class="badge-svg '
    .concat(e ? "earned" : "locked", '" viewBox="0 0 40 40" width="')
    .concat(t, '" height="')
    .concat(t, '" role="img" aria-label="')
    .concat(a, " Badge")
    .concat(e ? "" : " (not earned)", '">')
    .concat(s, "</svg>");
}
const yo = [];
function bo(a) {
  return a.split(" ★ ").slice(1).join(" ★ ");
}
const Xe = 1.6,
  pt = 2.2,
  js = 2.4,
  yt = 1.3,
  go = { layup: [0, 6], mid: [10, 17], three: [23.75, 27] };
function vo(a, e, t = 32) {
  const [s, n] = go[a],
    o = hoopXOf(e),
    r = e === 0 ? Math.PI : 0,
    i = r - Math.PI / 2,
    l = r + Math.PI / 2,
    c = e === 0 ? COURT_HALF_WIDTH : 0,
    h = (u, m) => [
      e === 0 ? clampNum(o + Math.cos(m) * u, COURT_HALF_WIDTH / 2, c) : clampNum(o + Math.cos(m) * u, c, COURT_HALF_WIDTH / 2),
      clampNum(COURT_MID_Y + Math.sin(m) * u, 0, COURT_MID_X),
    ],
    d = [],
    f = [];
  for (let u = 0; u <= t; u++) {
    const m = i + ((l - i) * u) / t;
    (d.push(h(n, m)), f.push(h(s, m)));
  }
  return s === 0 ? [...d, [c, d[t][1]], [c, d[0][1]]] : [...d, ...f.reverse()];
}
function ko(a, e) {
  const t = e.x - a.x,
    s = e.y - a.y,
    n = Math.hypot(t, s);
  if (n < pt * 2 + js) return null;
  const o = t / n,
    r = s / n,
    i = (h) => [a.x + o * h, a.y + r * h],
    l = i(n - pt),
    c = i(n - pt - js);
  return { tail: i(pt), neck: c, tip: l, left: [c[0] - r * yt, c[1] + o * yt], right: [c[0] + r * yt, c[1] - o * yt] };
}
function So(a, e) {
  return e ? 1 : 0.5 + 0.5 * Math.sin(a * 5);
}
function wo(a, e) {
  return e ? 0 : -((a * 12) % 8);
}
const je = new Map(),
  qs = new Map();
function Po(a) {
  const e = document.createElement("canvas");
  ((e.width = a.naturalWidth), (e.height = a.naturalHeight));
  const t = e.getContext("2d");
  t.drawImage(a, 0, 0);
  try {
    const { data: s, width: n, height: o } = t.getImageData(0, 0, e.width, e.height);
    let r = n,
      i = o,
      l = -1,
      c = -1;
    for (let d = 0; d < o; d++)
      for (let f = 0; f < n; f++)
        s[(d * n + f) * 4 + 3] > 20 && (f < r && (r = f), f > l && (l = f), d < i && (i = d), d > c && (c = d));
    if (l < 0) return { img: a, w: a.naturalWidth, h: a.naturalHeight };
    const h = document.createElement("canvas");
    return (
      (h.width = l - r + 1),
      (h.height = c - i + 1),
      h.getContext("2d").drawImage(e, r, i, h.width, h.height, 0, 0, h.width, h.height),
      { img: h, w: h.width, h: h.height }
    );
  } catch {
    return { img: a, w: a.naturalWidth, h: a.naturalHeight };
  }
}
function Us(a, e) {
  if (je.has(a)) return Promise.resolve(je.get(a));
  const t = qs.get(a);
  if (t) return t;
  const s = new Promise((n) => {
    const o = new Image();
    o.crossOrigin = "anonymous";
    let r = !1;
    ((o.onload = () => {
      const i = Po(o);
      (je.set(a, i), n(i));
    }),
      (o.onerror = () => {
        if (!r && !e.startsWith("data:")) {
          ((r = !0),
            window.setTimeout(() => {
              o.src = "".concat(e).concat(e.includes("?") ? "&" : "?", "r=1");
            }, 700));
          return;
        }
        (je.set(a, null), n(null));
      }),
      (o.src = e));
  });
  return (qs.set(a, s), s);
}
function Ea(a) {
  return Promise.all(a.flatMap((e) => [Us("f" + e.dex, le(e.dex)), Us("b" + e.dex, le(e.dex, !0))]));
}
function xo(a, e) {
  var t;
  if (e) {
    const s = je.get("b" + a);
    if (s) return s;
  }
  return (t = je.get("f" + a)) != null ? t : null;
}
const Se = "#ffcb05",
  Mo = { layup: "#7ac74c", mid: "#6390f0", three: Se },
  To = ["###..#.", "#.#.##.", "###..#.", "#....#.", "#...###"],
  ce = 480,
  Le = 270,
  tt = 98,
  Fa = 258,
  bt = 5.9,
  $o = 8,
  gt = (Fa - tt) / COURT_MID_X,
  Ze = (a) => a.heightFt - 0.5;
class gs {
  constructor(e) {
    ((this.camX = 47),
      (this.showUser = !0),
      (this.crowd = []),
      (this.particles = []),
      (this.flash = 0),
      (this.hype = 0),
      (this.meterGhost = { v: 0, w: 0, t: 0, p: null }),
      (this.t = 0),
      (this.court = null),
      (this.logo = null),
      (this.calm =
        typeof window != "undefined" &&
        typeof window.matchMedia == "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches),
      (this.jumpGhost = { v: 0, w: 0, t: 0 }),
      (e.width = ce),
      (e.height = Le),
      (this.ctx = e.getContext("2d")),
      (this.ctx.imageSmoothingEnabled = !1));
  }
  useCourt(e) {
    if (
      ((this.court = e),
      (this.crowd = [this.buildCrowd(0, e.crowd), this.buildCrowd(1, e.crowd)]),
      e.logo === "pokeball")
    )
      return;
    const t = new Image();
    ((t.onload = () => {
      const s = document.createElement("canvas");
      ((s.width = 64), (s.height = 64), s.getContext("2d").drawImage(t, 0, 0, 64, 64), (this.logo = s));
    }),
      (t.src = "data:image/svg+xml;charset=utf-8,".concat(encodeURIComponent(po(e.logo, !0, 64)))));
  }
  proj(e, t, s = 0) {
    const n = t / COURT_MID_X,
      o = bt + ($o - bt) * n;
    return { x: ce / 2 + (e - this.camX) * o, y: tt + (Fa - tt) * n - s * o * 0.95, s: o };
  }
  buildCrowd(e, t) {
    const s = document.createElement("canvas");
    ((s.width = 1200), (s.height = tt - 12));
    const n = s.getContext("2d");
    ((n.fillStyle = "#141833"), n.fillRect(0, 0, s.width, s.height));
    const o = [...t, ...t, ...t, "#e3350d", "#3b5ba7", "#ffcb05", "#f4f1e8", "#7ac74c", "#2a2f55"],
      r = ["#f1c27d", "#c68642", "#8d5524", "#ffdbac", "#e0ac69"];
    let i = 1337;
    const l = () => (i = (i * 16807) % 2147483647) / 2147483647;
    for (let c = 0; c < 12; c++) {
      const h = 6 + c * 6.5;
      ((n.fillStyle = c % 2 ? "#1c2145" : "#20264f"), n.fillRect(0, h + 3, s.width, 4));
      for (let d = 2; d < s.width; d += 4 + Math.floor(l() * 2)) {
        if (l() < 0.12) continue;
        const f = e === 1 && l() < 0.45 ? 1 : 0;
        ((n.fillStyle = o[Math.floor(l() * o.length)]),
          n.fillRect(d, h + 2 - f, 3, 3),
          (n.fillStyle = r[Math.floor(l() * r.length)]),
          n.fillRect(d + 1, h - f, 2, 2));
      }
    }
    return s;
  }
  screenOf(e, t, s = 0) {
    const n = this.proj(e, t, s);
    return { x: n.x, y: n.y };
  }
  view(e, t, s = 0) {
    return this.proj(e, t, s);
  }
  backdrop(e, t, s) {
    (this.court !== e && this.useCourt(e),
      (this.t += t),
      (this.hype = s ? 1 : 0),
      this.drawArena(this.ctx),
      this.drawFloor(this.ctx));
  }
  snap(e) {
    this.camX = clampNum(e.focusX(), 21, COURT_HALF_WIDTH - 21);
  }
  handle(e, t) {
    for (const s of e)
      if (s.kind === "score")
        ((this.hype = 2.5),
          s.how === "dunk"
            ? ((this.flash = 0.18), this.burst(t.ball.x, t.ball.y, 10, 26, ["#ffcb05", "#ffffff", "#ee8130"], 9))
            : s.points === 3 && this.burst(t.ball.x, t.ball.y, 10, 16, ["#ffcb05", "#f4f1e8"], 6));
      else if (s.kind === "block" || s.kind === "steal")
        this.burst(t.ball.x, t.ball.y, t.ball.z, 10, ["#ffffff", "#ffcb05"], 6);
      else if (s.kind === "special") {
        const n = s.player;
        this.flash = 0.12;
        const o = n.mon.special,
          r =
            o === "freeze"
              ? ["#96d9d6", "#ffffff"]
              : o === "quake"
                ? ["#e2bf65", "#8a6a3a"]
                : o === "phase"
                  ? ["#735797", "#c9b6ff"]
                  : ["#ffcb05", "#ffffff"];
        this.burst(n.x, n.y, 3, 30, r, 12);
      } else s.kind === "shove" && s.ok && this.burst(s.victim.x, s.victim.y, 4, 10, ["#ffffff", "#ff6b6b"], 7);
  }
  burst(e, t, s, n, o, r) {
    for (let i = 0; i < n; i++) {
      const l = re(0, Math.PI * 2),
        c = re(r * 0.4, r);
      this.particles.push({
        x: e,
        y: t,
        z: s,
        vx: Math.cos(l) * c,
        vy: Math.sin(l) * c,
        vz: re(2, r),
        life: re(0.4, 0.9),
        max: 0.9,
        color: o[i % o.length],
        size: re(1, 2.5),
        gravity: 18,
      });
    }
  }
  draw(e, t) {
    var i;
    this.t += t;
    const s = this.ctx;
    ((this.flash = Math.max(0, this.flash - t)), (this.hype = Math.max(0, this.hype - t)));
    const n = clampNum(e.focusX(), 21, COURT_HALF_WIDTH - 21);
    ((this.camX += (n - this.camX) * Math.min(1, t * 3.5)),
      s.save(),
      e.shake > 0 && s.translate(Math.round(re(-1, 1) * e.shake * 3), Math.round(re(-1, 1) * e.shake * 3)),
      this.court || this.useCourt((i = e.cfg.court) != null ? i : ms(e.teams[0])),
      this.drawArena(s),
      this.drawFloor(s),
      this.drawMarkers(s, e));
    for (const l of e.players) this.shadow(s, l.x, l.y, l.z, 1.1 * l.size);
    const o = e.ball;
    this.shadow(s, o.x, o.y, o.z, 0.6);
    const r = [];
    for (const l of e.players) r.push({ y: l.y, draw: () => this.drawPlayer(s, e, l) });
    (r.push({ y: o.y + (o.owner ? 0.01 : 0), draw: () => this.drawBall(s, e) }),
      r.push({ y: COURT_MID_Y + 0.02, draw: () => this.drawHoop(s, e, 0) }),
      r.push({ y: COURT_MID_Y + 0.02, draw: () => this.drawHoop(s, e, 1) }),
      r.sort((l, c) => l.y - c.y));
    for (const l of r) l.draw();
    (this.updateParticles(s, e, t),
      this.drawMeter(s, e, t),
      this.drawJumpMeter(s, e, t),
      this.drawUserMarker(s, e),
      s.restore(),
      this.flash > 0 && ((s.fillStyle = "rgba(255,255,255,".concat(this.flash * 2.5, ")")), s.fillRect(0, 0, ce, Le)));
  }
  drawArena(e) {
    ((e.fillStyle = "#0b0e22"), e.fillRect(0, 0, ce, Le));
    const t = this.hype > 0 ? Math.floor(this.t * 8) % 2 : Math.floor(this.t * 1.5) % 2,
      s = this.crowd[Math.abs(t) % 2],
      n = -((this.camX * bt * 0.85) % s.width) - 200;
    for (let S = n; S < ce; S += s.width) e.drawImage(s, Math.round(S), 0);
    const o = tt - 22;
    ((e.fillStyle = "#05060f"), e.fillRect(-4, o, ce + 8, 20));
    const r = this.court.boardColor,
      i = this.hype > 0 && Math.floor(this.t * 6) % 2 ? "#ffffff" : r;
    ((e.fillStyle = r),
      e.fillRect(-4, o, ce + 8, 1),
      e.fillRect(-4, o + 19, ce + 8, 1),
      (e.font = '8px "Press Start 2P", monospace'),
      (e.textBaseline = "alphabetic"));
    const l = o + 13,
      c = this.hype > 0 ? [] : yo.filter((S) => S.enabled),
      h = c.length > 0,
      d =
        this.hype > 0
          ? "  BUCKETS!  ★  BUCKETS!  ★ "
          : h
            ? "  ★ ".concat(bo(this.court.board), "  ★ ")
            : "  ".concat(this.court.board, "  ★ "),
      f = 4,
      u = 4,
      m = 4,
      p = 3,
      y = 190,
      v = y * c.length,
      b = h ? f + v : 0,
      k = b + Math.ceil(e.measureText(d).width || 400),
      w = -Math.floor((this.camX * bt + this.t * 12) % k),
      P = 0.8 + 0.2 * (Math.floor(this.t * 2) % 2);
    for (let S = w - k; S < ce + 4; S += k)
      (c.forEach(($, D) => {
        const R = S + f + D * y,
          A = R + 2 + u,
          K = Math.ceil(e.measureText($.tag).width) + p * 2,
          Y = y - 4 - u * 2 - K - m,
          J = Math.ceil(e.measureText($.text).width),
          g = Math.min(1, Y / J);
        ((e.globalAlpha = P),
          (e.fillStyle = $.border),
          e.fillRect(R, o + 2, y, 16),
          (e.globalAlpha = 1),
          (e.fillStyle = "#05060f"),
          e.fillRect(R + 1, o + 3, y - 2, 14),
          (e.fillStyle = $.bg),
          e.fillRect(R + 2, o + 4, y - 4, 12),
          (e.fillStyle = $.tagBg),
          e.fillRect(A, o + 5, K, 10),
          (e.fillStyle = "#ffffff"),
          e.fillText($.tag, A + p, l),
          (e.fillStyle = $.color),
          e.save(),
          e.translate(A + K + m + Math.floor((Y - J * g) / 2), l),
          e.scale(g, 1),
          e.fillText($.text, 0, 0),
          e.restore());
      }),
        (e.fillStyle = i),
        e.fillText(d, S + b, l));
  }
  poly(e, t, s = 0) {
    (e.beginPath(),
      t.forEach(([n, o], r) => {
        const i = this.proj(n, o, s);
        r ? e.lineTo(i.x, i.y) : e.moveTo(i.x, i.y);
      }),
      e.closePath());
  }
  arcPts(e, t, s, n, o, r = 28) {
    const i = [];
    for (let l = 0; l <= r; l++) {
      const c = n + ((o - n) * l) / r;
      i.push([e + Math.cos(c) * s, t + Math.sin(c) * s]);
    }
    return i;
  }
  line(e, t) {
    (e.beginPath(),
      t.forEach(([s, n], o) => {
        const r = this.proj(s, n);
        o
          ? e.lineTo(Math.round(r.x) + 0.5, Math.round(r.y) + 0.5)
          : e.moveTo(Math.round(r.x) + 0.5, Math.round(r.y) + 0.5);
      }),
      e.stroke());
  }
  floorImage(e, t, s, n, o, r) {
    const i = this.proj(s, n);
    (e.save(), e.translate(i.x, i.y), e.scale(i.s * o, gt * r), t(), e.restore());
  }
  drawFloor(e) {
    const t = this.court;
    ((e.fillStyle = t.apron),
      this.poly(e, [
        [-30, -2],
        [COURT_HALF_WIDTH + 30, -2],
        [COURT_HALF_WIDTH + 30, COURT_MID_X + 6],
        [-30, COURT_MID_X + 6],
      ]),
      e.fill(),
      (e.fillStyle = t.wood),
      this.poly(e, [
        [0, 0],
        [COURT_HALF_WIDTH, 0],
        [COURT_HALF_WIDTH, COURT_MID_X],
        [0, COURT_MID_X],
      ]),
      e.fill(),
      (e.fillStyle = "rgba(40,20,0,0.07)"));
    for (let o = 0; o < COURT_MID_X; o += 2.5)
      (this.poly(e, [
        [0, o],
        [COURT_HALF_WIDTH, o],
        [COURT_HALF_WIDTH, o + 1.25],
        [0, o + 1.25],
      ]),
        e.fill());
    if (
      ((e.fillStyle = t.paint),
      (e.globalAlpha = 0.8),
      this.poly(e, [
        [0, 17],
        [19, 17],
        [19, 33],
        [0, 33],
      ]),
      e.fill(),
      this.poly(e, [
        [COURT_HALF_WIDTH - 19, 17],
        [COURT_HALF_WIDTH, 17],
        [COURT_HALF_WIDTH, 33],
        [COURT_HALF_WIDTH - 19, 33],
      ]),
      e.fill(),
      (e.globalAlpha = 1),
      t.logo === "pokeball")
    )
      ((e.fillStyle = "#e3350d"),
        this.poly(e, this.arcPts(47, 25, 6, Math.PI, Math.PI * 2)),
        e.fill(),
        (e.fillStyle = "#f4f1e8"),
        this.poly(e, this.arcPts(47, 25, 6, 0, Math.PI)),
        e.fill(),
        (e.fillStyle = "#1b1b1b"),
        this.poly(e, [
          [41, 24.4],
          [53, 24.4],
          [53, 25.6],
          [41, 25.6],
        ]),
        e.fill(),
        this.poly(e, this.arcPts(47, 25, 2, 0, Math.PI * 2, 20)),
        e.fill(),
        (e.fillStyle = "#f4f1e8"),
        this.poly(e, this.arcPts(47, 25, 1.3, 0, Math.PI * 2, 20)),
        e.fill());
    else {
      ((e.fillStyle = t.paint), this.poly(e, this.arcPts(47, 25, 6, 0, Math.PI * 2, 40)), e.fill());
      const o = this.logo;
      o && this.floorImage(e, () => e.drawImage(o, -0.5, -0.5, 1, 1), 47, 25, 9.5, 9.5);
    }
    ((e.font = '10px "Press Start 2P", monospace'), (e.textAlign = "center"), (e.textBaseline = "middle"));
    const s = e.measureText(t.floorText).width || 100,
      n = Math.min(3.2, (34 / s) * 10);
    ((e.globalAlpha = 0.45),
      (e.fillStyle = t.lines),
      this.floorImage(e, () => e.fillText(t.floorText, 0, 0), 47, 9, n / 10, n / 10),
      (e.globalAlpha = 1),
      (e.textAlign = "start"),
      (e.strokeStyle = t.lines),
      (e.lineWidth = 1),
      this.line(e, [
        [0, 0],
        [COURT_HALF_WIDTH, 0],
        [COURT_HALF_WIDTH, COURT_MID_X],
        [0, COURT_MID_X],
        [0, 0],
      ]),
      this.line(e, [
        [47, 0],
        [47, COURT_MID_X],
      ]),
      this.line(e, this.arcPts(47, 25, 6, 0, Math.PI * 2, 40)));
    for (const o of [0, 1]) {
      const r = o ? COURT_HALF_WIDTH : 0,
        i = o ? -1 : 1,
        l = r + i * 5.25;
      (this.line(e, [
        [r, 17],
        [r + i * 19, 17],
        [r + i * 19, 33],
        [r, 33],
      ]),
        this.line(e, this.arcPts(r + i * 19, 25, 6, 0, Math.PI * 2, 32)));
      const c = Math.asin(22 / 23.75),
        h = l + i * Math.cos(c) * 23.75;
      (this.line(e, [
        [r, 3],
        [h, 3],
      ]),
        this.line(e, [
          [r, 47],
          [h, 47],
        ]),
        this.line(
          e,
          o ? this.arcPts(l, 25, 23.75, Math.PI - c, Math.PI + c, 40) : this.arcPts(l, 25, 23.75, -c, c, 40),
        ),
        this.line(
          e,
          o
            ? this.arcPts(l, 25, 4, Math.PI / 2, Math.PI * 1.5, 16)
            : this.arcPts(l, 25, 4, -Math.PI / 2, Math.PI / 2, 16),
        ));
    }
  }
  drawMarkers(e, t) {
    const s = t.markers;
    if (!s.length) return;
    const n = So(this.t, this.calm),
      o = (r) => (r.kind === "zone" ? 0 : r.kind === "lane" ? 1 : 2);
    e.save();
    for (const r of [...s].sort((i, l) => o(i) - o(l)))
      if (r.kind === "zone") this.drawZone(e, r.zone, r.team, n);
      else if (r.kind === "lane") {
        const i = t.players.find((c) => c.id === r.from),
          l = t.players.find((c) => c.id === r.to);
        i && l && this.drawLane(e, i, l, n);
      } else this.drawSpot(e, r.x, r.y, n);
    e.restore();
  }
  drawZone(e, t, s, n) {
    const o = vo(t, s),
      r = Mo[t];
    ((e.fillStyle = r),
      (e.globalAlpha = 0.16 + 0.12 * n),
      this.poly(e, o),
      e.fill(),
      (e.globalAlpha = 0.65 + 0.35 * n),
      (e.strokeStyle = r),
      (e.lineWidth = 1),
      this.line(e, [...o, o[0]]),
      (e.globalAlpha = 1));
  }
  drawLane(e, t, s, n) {
    const o = ko(t, s);
    if (!o) return;
    const r = ([c, h]) => this.proj(c, h),
      i = r(o.tail),
      l = r(o.neck);
    ((e.lineCap = "round"),
      (e.strokeStyle = "rgba(5,6,15,0.55)"),
      (e.lineWidth = 4),
      e.beginPath(),
      e.moveTo(i.x, i.y),
      e.lineTo(l.x, l.y),
      e.stroke(),
      (e.strokeStyle = Se),
      (e.globalAlpha = 0.7 + 0.3 * n),
      (e.lineWidth = 2),
      e.setLineDash([4, 4]),
      (e.lineDashOffset = wo(this.t, this.calm)),
      e.stroke(),
      e.setLineDash([]),
      (e.lineDashOffset = 0),
      (e.fillStyle = Se),
      (e.strokeStyle = "rgba(5,6,15,0.55)"),
      (e.lineWidth = 1),
      this.poly(e, [o.left, o.tip, o.right]),
      e.fill(),
      e.stroke(),
      (e.globalAlpha = 1),
      (e.lineCap = "butt"));
  }
  drawSpot(e, t, s, n) {
    if (
      ((e.fillStyle = Se),
      (e.globalAlpha = 0.18 + 0.17 * n),
      this.poly(e, this.arcPts(t, s, Xe * 2, 0, Math.PI * 2, 28)),
      e.fill(),
      (e.globalAlpha = 1),
      (e.fillStyle = "rgba(5,6,15,0.6)"),
      this.poly(e, this.arcPts(t, s, Xe + 0.3, 0, Math.PI * 2, 24)),
      e.fill(),
      (e.fillStyle = Se),
      this.poly(e, this.arcPts(t, s, Xe, 0, Math.PI * 2, 24)),
      e.fill(),
      (e.fillStyle = "#ffffff"),
      this.poly(e, this.arcPts(t, s, Xe * 0.45, 0, Math.PI * 2, 16)),
      e.fill(),
      !this.calm)
    ) {
      const o = (this.t * 0.9) % 1;
      ((e.strokeStyle = Se),
        (e.lineWidth = 1),
        (e.globalAlpha = 1 - o),
        this.line(e, this.arcPts(t, s, Xe * (1.2 + 1.6 * o), 0, Math.PI * 2, 28)),
        (e.globalAlpha = 1));
    }
  }
  shadow(e, t, s, n, o) {
    const r = this.proj(t, s),
      i = clampNum(1 - n / 16, 0.35, 1);
    ((e.fillStyle = "rgba(20,10,0,".concat(0.32 * i, ")")),
      e.beginPath(),
      e.ellipse(r.x, r.y, o * r.s * i, o * gt * 0.55 * i + 0.5, 0, 0, Math.PI * 2),
      e.fill());
  }
  drawPlayer(e, t, s) {
    var p;
    const n = t.teams[s.team],
      o = this.proj(s.x, s.y),
      r = 1.15 * s.size * o.s,
      i = 1.15 * s.size * gt * 0.6;
    (e.beginPath(),
      e.ellipse(o.x, o.y, r + 1, i + 1, 0, 0, Math.PI * 2),
      (e.fillStyle = "rgba(0,0,0,0.45)"),
      e.fill(),
      e.beginPath(),
      e.ellipse(o.x, o.y, r, i, 0, 0, Math.PI * 2));
    const l = this.showUser && s.human && s.team === t.viewTeam;
    if (
      ((e.fillStyle = n.color + (l ? "cc" : "88")),
      e.fill(),
      (e.lineWidth = 2),
      (e.strokeStyle = l ? Se : n.color),
      e.stroke(),
      l)
    ) {
      const y = 1.25 + 0.15 * Math.sin(this.t * 8);
      (e.beginPath(),
        e.ellipse(o.x, o.y, r * y + 1, i * y + 1, 0, 0, Math.PI * 2),
        (e.lineWidth = 1.5),
        (e.strokeStyle = "rgba(255,203,5,0.75)"),
        e.stroke());
    }
    const c = this.proj(s.x, s.y, s.z),
      h = xo(s.mon.dex, s.back),
      d = Ze(s) * c.s;
    let f = 0;
    if (
      (Math.hypot(s.vx, s.vy) > 2 &&
        s.z === 0 &&
        s.state === "free" &&
        (f = Math.abs(Math.sin(s.runPhase * 2.2)) * 1.6),
      e.save(),
      e.translate(Math.round(c.x), Math.round(c.y - f)),
      s.fx.phase > 0 && (e.globalAlpha = 0.35 + 0.2 * Math.sin(this.t * 30)),
      s.state === "stun" && e.rotate((Math.PI / 2) * -s.facing * Math.min(1, (1.2 - s.stateT) * 6)),
      s.state === "dunk" && (p = s.dunk) != null && p.spin)
    ) {
      const y = s.dunk.t / s.dunk.T;
      (e.translate(0, -d / 2), e.rotate(y * Math.PI * 2 * s.facing), e.translate(0, d / 2));
    }
    if (h) {
      const y = d / Math.max(h.w, h.h),
        v = h.w * y,
        b = h.h * y;
      let k = s.facing === 1 ? -1 : 1;
      s.back && (k = -k);
      const w = s.vz > 4 ? 1.08 : 1;
      (e.scale(k, w), e.drawImage(h.img, Math.round(-v / 2), Math.round(-b), Math.round(v), Math.round(b)));
    } else
      ((e.fillStyle = n.color),
        e.beginPath(),
        e.arc(0, -d / 2, d / 2.6, 0, Math.PI * 2),
        e.fill(),
        (e.fillStyle = "#fff"),
        (e.font = '8px "Press Start 2P", monospace'),
        (e.textAlign = "center"),
        (e.textBaseline = "middle"),
        e.fillText(s.mon.name[0], 0, -d / 2));
    e.restore();
    const m = this.proj(s.x, s.y, s.z + Ze(s) + 0.3);
    if (s.state === "stun")
      for (let y = 0; y < 3; y++) {
        const v = this.t * 6 + (y * Math.PI * 2) / 3;
        ((e.fillStyle = "#ffcb05"),
          e.fillRect(Math.round(o.x + Math.cos(v) * 7), Math.round(o.y - 10 + Math.sin(v) * 2), 2, 2));
      }
    (s.fire && Math.random() < 0.7 && this.emit(s, ["#ff4d00", "#ffcb05", "#ff8a00"], 6),
      s.fx.surge > 0 && Math.random() < 0.5 && this.emit(s, ["#ffe066", "#ffffff"], 3),
      s.fx.slow > 0 && Math.random() < 0.3 && this.emit(s, ["#bfefff", "#ffffff"], 2),
      s.turboOn &&
        s.z === 0 &&
        Math.random() < 0.4 &&
        this.particles.push({
          x: s.x,
          y: s.y,
          z: 0.2,
          vx: -s.vx * 0.1,
          vy: -s.vy * 0.1,
          vz: 1,
          life: 0.3,
          max: 0.3,
          color: "rgba(255,255,255,0.7)",
          size: 1.5,
          gravity: 0,
        }),
      s.fx.lockin &&
        ((e.strokeStyle = "#f95587"),
        (e.lineWidth = 1),
        e.beginPath(),
        e.arc(m.x, m.y - 3, 3 + Math.sin(this.t * 8), 0, Math.PI * 2),
        e.stroke()));
  }
  emit(e, t, s) {
    this.particles.push({
      x: e.x + re(-0.8, 0.8),
      y: e.y + re(-0.3, 0.3),
      z: e.z + re(0.5, e.heightFt),
      vx: re(-1, 1),
      vy: re(-0.5, 0.5),
      vz: re(s * 0.5, s),
      life: re(0.3, 0.6),
      max: 0.6,
      color: t[Math.floor(Math.random() * t.length)],
      size: re(1, 2.2),
      gravity: 0,
    });
  }
  drawBall(e, t) {
    var l, c;
    const s = t.ball,
      n = this.proj(s.x, s.y, s.z),
      o = Math.max(2.5, COURT_SCALE_H * 1.6 * n.s);
    ((((l = s.owner) != null && l.fire) || ((c = s.shot) != null && c.shooter.fire)) &&
      Math.random() < 0.8 &&
      this.particles.push({
        x: s.x,
        y: s.y,
        z: s.z,
        vx: re(-1, 1),
        vy: 0,
        vz: re(1, 4),
        life: 0.35,
        max: 0.35,
        color: Math.random() < 0.5 ? "#ff4d00" : "#ffcb05",
        size: 2,
        gravity: 0,
      }),
      (e.fillStyle = "#e8762c"),
      e.beginPath(),
      e.arc(Math.round(n.x), Math.round(n.y), o, 0, Math.PI * 2),
      e.fill(),
      (e.strokeStyle = "#5a2a0a"),
      (e.lineWidth = 1),
      e.stroke(),
      e.beginPath());
    const i = s.spin;
    (e.moveTo(n.x + Math.cos(i) * o, n.y + Math.sin(i) * o),
      e.lineTo(n.x - Math.cos(i) * o, n.y - Math.sin(i) * o),
      e.stroke(),
      (e.fillStyle = "rgba(255,255,255,0.45)"),
      e.fillRect(Math.round(n.x - o * 0.45), Math.round(n.y - o * 0.55), 1, 1));
  }
  drawHoop(e, t, s) {
    const n = s ? COURT_HALF_WIDTH : 0,
      o = s ? -1 : 1,
      r = n + o * 5.25,
      i = n + o * 4,
      l = Math.sin(this.t * 50) * t.rimShake[s] * 0.35,
      c = this.proj(n - o * 3, COURT_MID_Y),
      h = this.proj(n - o * 3, COURT_MID_Y, 12.5),
      d = this.proj(i, COURT_MID_Y, 12.5);
    ((e.fillStyle = "#2b2f45"),
      e.fillRect(Math.round(c.x - 3), Math.round(h.y), 6, Math.round(c.y - h.y)),
      (e.fillStyle = this.court.paint),
      e.fillRect(Math.round(c.x - 4), Math.round(c.y - 18), 8, 18),
      (e.strokeStyle = "#3a3f5c"),
      (e.lineWidth = 3),
      e.beginPath(),
      e.moveTo(h.x, h.y),
      e.lineTo(d.x, d.y),
      e.stroke());
    const u = [
        [i, 22, 9 + l],
        [i, 28, 9 + l],
        [i, 28, 13.5 + l],
        [i, 22, 13.5 + l],
      ].map(([P, S, $]) => this.proj(P, S, $)),
      m = 2.5 * o;
    ((e.fillStyle = "rgba(220,235,255,0.55)"),
      e.beginPath(),
      u.forEach((P, S) => (S ? e.lineTo(P.x + m * (S === 1 || S === 2 ? 1 : 0), P.y) : e.moveTo(P.x, P.y))),
      e.closePath(),
      e.fill(),
      (e.strokeStyle = "#ffffff"),
      (e.lineWidth = 1),
      e.stroke());
    const p = [
      [i, 24, 10],
      [i, 26, 10],
      [i, 26, 11.5],
      [i, 24, 11.5],
    ].map(([P, S, $]) => this.proj(P, S, $ + l));
    ((e.strokeStyle = "#e3350d"),
      e.beginPath(),
      p.forEach((P, S) => (S ? e.lineTo(P.x, P.y) : e.moveTo(P.x, P.y))),
      e.closePath(),
      e.stroke());
    const y = this.proj(r, COURT_MID_Y, HOOP_OFFSET + l),
      v = COURT_SCALE_W * y.s,
      b = COURT_SCALE_W * gt,
      k = t.netT[s],
      w = 1.6 * y.s * 0.95 * (1 + k * 0.6);
    ((e.strokeStyle = "rgba(255,255,255,0.85)"), (e.lineWidth = 1));
    for (let P = 0; P <= 6; P++) {
      const S = (P / 6) * Math.PI,
        $ = y.x + Math.cos(S) * v,
        D = y.y + Math.sin(S) * b,
        R = y.x + Math.cos(S) * v * 0.55 + Math.sin(this.t * 40) * k * 2,
        A = y.y + w + Math.sin(S) * b * 0.5;
      (e.beginPath(), e.moveTo($, D), e.lineTo(R, A), e.stroke());
    }
    (e.beginPath(),
      e.ellipse(y.x, y.y + w * 0.55, v * 0.75, b * 0.7, 0, 0, Math.PI * 2),
      e.stroke(),
      (e.strokeStyle = "#ff5a1f"),
      (e.lineWidth = 2),
      e.beginPath(),
      e.ellipse(y.x, y.y, v, b, 0, 0, Math.PI * 2),
      e.stroke());
  }
  updateParticles(e, t, s) {
    const n = [];
    for (const o of this.particles) {
      if (
        (t.paused ||
          ((o.life -= s),
          (o.vz -= o.gravity * s),
          (o.x += o.vx * s),
          (o.y += o.vy * s),
          (o.z = Math.max(0, o.z + o.vz * s))),
        o.life <= 0)
      )
        continue;
      n.push(o);
      const r = this.proj(o.x, o.y, o.z);
      ((e.globalAlpha = clampNum((o.life / o.max) * 1.5, 0, 1)), (e.fillStyle = o.color));
      const i = Math.max(1, Math.round(o.size));
      e.fillRect(Math.round(r.x), Math.round(r.y), i, i);
    }
    ((e.globalAlpha = 1), (this.particles = n.length > 400 ? n.slice(-400) : n));
  }
  drawMeter(e, t, s) {
    const n = t.user,
      o = this.meterGhost;
    if (
      (n && n.state === "shoot" ? ((o.v = n.meter), (o.w = t.greenWindow(n)), (o.t = 0.5), (o.p = n)) : (o.t -= s),
      o.t <= 0 || !o.p)
    )
      return;
    const r = o.p,
      i = this.proj(r.x, r.y, r.z + Ze(r)),
      l = Math.round(i.x + 10 * (r.facing === 1 ? -1 : 1) - 3),
      c = 30,
      h = Math.round(i.y - 4);
    ((e.globalAlpha = clampNum(o.t * 3, 0, 1)), (e.fillStyle = "#05060f"), e.fillRect(l - 1, h - 1, 7, c + 2));
    const d = clampNum(rt - o.w, 0, 1),
      f = clampNum(rt + o.w, 0, 1);
    ((e.fillStyle = "#2f3560"),
      e.fillRect(l, h, 5, c),
      (e.fillStyle = "#21d07a"),
      e.fillRect(l, Math.round(h + c - f * c), 5, Math.max(1, Math.round((f - d) * c))));
    const u = clampNum(o.v, 0, 1.1),
      m = o.v >= d && o.v <= f;
    ((e.fillStyle = m ? "#ffffff" : "#ffcb05"),
      e.fillRect(l - 1, Math.round(h + c - Math.min(1, u) * c), 7, 2),
      (e.globalAlpha = 1));
  }
  drawJumpMeter(e, t, s) {
    var b, k;
    const n = t.tipoff,
      o = this.jumpGhost,
      r = t.viewTeam,
      i = n == null ? void 0 : n.jumpers[r];
    if (
      (n && i != null && i.human && n.t >= -0.4
        ? ((o.v = (b = n.ENGINE_VERSION[r]) != null ? b : t.jumpMeter()),
          (o.w = n.window),
          (o.t = n.ENGINE_VERSION[r] === null ? 0.7 : o.t - s))
        : (o.t -= s),
      o.t <= 0)
    )
      return;
    const l = 1.5,
      c = (k = n == null ? void 0 : n.jumpers[r]) != null ? k : t.user;
    if (!c) return;
    const h = this.proj(c.x, c.y, c.z + Ze(c)),
      d = Math.round(h.x - 18),
      f = 36,
      u = Math.round(h.y - 10);
    ((e.globalAlpha = clampNum(o.t * 3, 0, 1)),
      (e.fillStyle = "#05060f"),
      e.fillRect(d - 1, u - 1, 8, f + 2),
      (e.fillStyle = "#2f3560"),
      e.fillRect(d, u, 6, f));
    const m = (1 - o.w) / l,
      p = (1 + o.w) / l;
    ((e.fillStyle = "#21d07a"), e.fillRect(d, Math.round(u + f - p * f), 6, Math.max(2, Math.round((p - m) * f))));
    const y = clampNum(o.v / l, 0, 1),
      v = o.v >= 1 - o.w && o.v <= 1 + o.w;
    ((e.fillStyle = v ? "#ffffff" : "#ffcb05"),
      e.fillRect(d - 1, Math.round(u + f - y * f) - 1, 8, 2),
      n &&
        n.ENGINE_VERSION[0] === null &&
        ((e.font = '6px "Press Start 2P", monospace'),
        (e.textAlign = "center"),
        (e.fillStyle = "#05060f"),
        e.fillText(n.t < 0 ? "JUMP BALL" : "JUMP AT THE TOP!", Math.round(h.x) + 1, u - 5),
        (e.fillStyle = n.t < 0 ? "#ffffff" : "#ffcb05"),
        e.fillText(n.t < 0 ? "JUMP BALL" : "JUMP AT THE TOP!", Math.round(h.x), u - 6),
        (e.textAlign = "start")),
      (e.globalAlpha = 1));
  }
  drawUserMarker(e, t) {
    const s = t.user;
    if (!s || !this.showUser) return;
    const n = this.proj(s.x, s.y, s.z + Ze(s) + 1.2),
      o = clampNum(Math.round(n.x), 11, ce - 11),
      r = Math.max(16, Math.round(n.y - 3 + Math.sin(this.t * 6)));
    ((e.fillStyle = "#05060f"),
      e.beginPath(),
      e.moveTo(o - 5, r - 4),
      e.lineTo(o + 5, r - 4),
      e.lineTo(o, r + 2),
      e.closePath(),
      e.fill(),
      (e.fillStyle = Se),
      e.beginPath(),
      e.moveTo(o - 3.5, r - 4),
      e.lineTo(o + 3.5, r - 4),
      e.lineTo(o, r),
      e.closePath(),
      e.fill(),
      (e.fillStyle = "#05060f"),
      e.fillRect(o - 7, r - 13, 15, 9),
      (e.fillStyle = Se),
      e.fillRect(o - 6, r - 12, 13, 7),
      (e.fillStyle = "#05060f"),
      To.forEach((i, l) =>
        [...i].forEach((c, h) => {
          c === "#" && e.fillRect(o - 4 + h, r - 11 + l, 1, 1);
        }),
      ),
      (n.x < 0 || n.x > ce) &&
        ((e.fillStyle = "#ffffff"),
        (e.font = '6px "Press Start 2P", monospace'),
        (e.textAlign = n.x < 0 ? "left" : "right"),
        e.fillText(n.x < 0 ? "◀ P1" : "P1 ▶", n.x < 0 ? 2 : ce - 2, r + 10),
        (e.textAlign = "start")));
  }
}
const vs = "pokejam.draftedTeam",
  _s = /^#[0-9a-f]{6}$/i;
function Eo(a) {
  const { starters: e } = ye(a);
  return e.map((t) => a.indexOf(t));
}
function oi(a) {
  const { mons: e, ...t } = a,
    s = { ...t, v: 1, dex: e.map((n) => n.dex), starters: Eo(e), savedAt: Date.now() };
  try {
    localStorage.setItem(vs, JSON.stringify(s));
  } catch {}
}
function Fo() {
  try {
    const a = localStorage.getItem(vs);
    if (!a) return null;
    const e = JSON.parse(a);
    if (!e || e.v !== 1 || typeof e.name != "string" || !Array.isArray(e.dex) || !Array.isArray(e.starters))
      return null;
    const t = new Set(POKEMON_LIST.map((r) => r.dex));
    if (
      e.dex.length !== 10 ||
      !e.dex.every((r) => Number.isInteger(r) && t.has(r)) ||
      e.starters.length !== 5 ||
      new Set(e.starters).size !== 5 ||
      !e.starters.every((r) => Number.isInteger(r) && r >= 0 && r < 10) ||
      !e.colors ||
      !_s.test(e.colors.color) ||
      !_s.test(e.colors.color2)
    )
      return null;
    const s = zt(e.name);
    if (!s) return null;
    const n = profanityFn(s, "Pallet Town"),
      o = e.record;
    return {
      v: 1,
      name: n,
      dex: e.dex,
      starters: e.starters,
      colors: { color: e.colors.color, color2: e.colors.color2 },
      abbr: typeof e.abbr == "string" ? challengeStorage(e.abbr, n) : void 0,
      record: o && Number.isInteger(o.w) && Number.isInteger(o.l) && o.w >= 0 && o.l >= 0 ? { w: o.w, l: o.l } : void 0,
      rank: Number.isInteger(e.rank) && e.rank > 0 ? e.rank : void 0,
      savedAt: typeof e.savedAt == "number" ? e.savedAt : 0,
    };
  } catch {
    return null;
  }
}
function ri(a) {
  const e = Fo(),
    t = zt(a);
  if (!e || !t || DRILL_TABLE(t)) return e;
  const s = { ...e, name: t, abbr: drillSpawn(t) };
  try {
    localStorage.setItem(vs, JSON.stringify(s));
  } catch {}
  return s;
}
const Ao = (a) => a.dex.map(getPokemon),
  ii = (a) => ye(Ao(a)).starters;
function Ks(a, e, t = []) {
  const s = [];
  for (; s.length < e && a.length;) {
    const n = Ce(a, s, t);
    (a.splice(a.indexOf(n), 1), s.push(n));
  }
  return s;
}
function li(a, e, t) {
  const s = [...POKEMON_LIST].sort((r, i) => i.ovr - r.ovr),
    n = a.map(() => []);
  if (t) {
    n[0] = [...t];
    for (const r of t) s.splice(s.indexOf(r), 1);
  }
  const o = shuffleArr(a.map((r, i) => i));
  for (let r = 0; r < e; r++)
    for (const i of r % 2 ? [...o].reverse() : o) {
      if (t && i === 0) continue;
      const l = Ce(s, n[i], a[i].types);
      (s.splice(s.indexOf(l), 1), n[i].push(l));
    }
  return { rosters: n, leftovers: s };
}
const qt = 1 / 60,
  Co = 1e3 / 30,
  Go = 240 * 1e3,
  Vs = (a) => {
    const e = Math.max(0, a.clock),
      t = a.quarter > 4 ? "OT" : ["1ST", "2ND", "3RD", "4TH"][a.quarter - 1];
    return a.phase === "final"
      ? "FINAL"
      : ""
          .concat(t, " ")
          .concat(
            e < 10
              ? e.toFixed(1)
              : "".concat(Math.floor(e / 60), ":").concat(String(Math.floor(e % 60)).padStart(2, "0")),
          );
  };
function Lo() {
  const a = navigator.connection;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches || !!(a != null && a.saveData);
}
function Io() {
  var o;
  const [a, e] = shuffleArr([...LEAGUE_GYMS]).slice(0, 2),
    t = shuffleArr([...POKEMON_LIST]),
    s = { name: a.name, abbr: a.abbr, color: a.color, color2: a.color2, roster: Ks(t, 5, a.types), human: !1 },
    n = va(s, { name: e.name, abbr: e.abbr, color: e.color, color2: e.color2, roster: Ks(t, 5, e.types), human: !1 });
  return new MatchEngine({
    home: s,
    away: n,
    quarterLen: 45,
    difficulty: "allstar",
    court: (o = ds[a.name]) != null ? o : ms(a),
  });
}
function Oo(a, e) {
  const t = new gs(a);
  let s = null,
    n = 0,
    o = !1,
    r = performance.now(),
    i = 0,
    l = 0,
    c = 0,
    h = 0,
    d = "",
    f = !1;
  const u = () => {
      if (f) return;
      f = !0;
      const b = Io();
      Ea([...b.cfg.home.roster, ...b.cfg.away.roster]).then(() => {
        ((f = !1), !o && ((s = b), t.snap(b), (c = performance.now()), (h = 0), (l = 0)));
      });
    },
    m = () => {
      var k, w;
      if (!s) return;
      const b = "".concat(s.score[0], "-").concat(s.score[1], " ").concat(Vs(s));
      b !== d &&
        ((d = b),
        e({
          venue: (w = (k = s.cfg.court) == null ? void 0 : k.venue) != null ? w : "",
          home: s.teams[0].abbr,
          away: s.teams[1].abbr,
          score: [s.score[0], s.score[1]],
          clock: Vs(s),
        }));
    },
    p = (b) => {
      if (o || !a.isConnected) return v();
      if (((n = requestAnimationFrame(p)), b - i < Co - 2)) return;
      i = b;
      const k = Math.max(0, Math.min(0.1, (b - r) / 1e3));
      if (((r = b), !!s)) {
        for (l += k; l >= qt;) (s.update(qt), (l -= qt));
        (t.handle(s.events.splice(0), s),
          (s.sfx.length = 0),
          t.draw(s, k),
          m(),
          s.phase === "final" && (h || (h = b)),
          ((h && b - h > 5e3) || b - c > Go) && ((s = null), u()));
      }
    },
    y = () => {
      if (!o) {
        if (!a.isConnected) return v();
        (cancelAnimationFrame(n), document.hidden || ((r = performance.now()), (n = requestAnimationFrame(p))));
      }
    };
  document.addEventListener("visibilitychange", y);
  function v() {
    ((o = !0), cancelAnimationFrame(n), document.removeEventListener("visibilitychange", y), (s = null));
  }
  return (u(), (n = requestAnimationFrame(p)), { stop: v });
}
const Ro = ["full", "quick", "off"],
  Do = 6e3,
  No = 3e3,
  ci = 1e4;
function zo(a) {
  return typeof a == "string" && Ro.includes(a);
}
function hi(a, e) {
  return e === "ranked" || e === "social" ? !0 : a !== "off";
}
function ui(a, e, t, s) {
  return t ? s : a === "full";
}
function fi(a, e, t = "full") {
  const s = t === "quick" && a !== "ranked" && a !== "social" ? No : Do;
  return { lengthMs: s, capMs: s, instantSkip: !0 };
}
class di {
  constructor() {
    ((this.mine = !1), (this.theirs = !1));
  }
  vote(e, t) {
    this[e] = t;
  }
  both() {
    return this.mine && this.theirs;
  }
  label() {
    return this.both() ? "2/2 ready" : this.mine ? "Waiting for opponent" : this.theirs ? "1/2 ready" : "Skip";
  }
}
function Aa() {
  return '\n    <div class="controls">\n      <h3>触屏操作</h3>\n      <ul class="touch-help">\n        <li><b>移动</b>：按住左下摇杆拖动</li>\n        <li><b>右侧按钮</b>：投篮 / 传球 / 抢断 / 加速 / 必杀（攻防自动互换）</li>\n        <li><b>投篮</b>：按住蓄力，力度条变绿的瞬间松开 = 完美出手必进</li>\n        <li><b>必杀</b>：槽蓄满后点必杀键，放出招牌招式</li>\n      </ul>\n    </div>';
}
function mi(a, e = {}) {
  return '\n    <div class="game-settings">\n      <div class="field">Difficulty\n        <div class="seg" id="difficulty">\n          '
    .concat(
      Object.keys(DIFFICULTY_LEVELS)
        .map((t) =>
          '<button data-v="'
            .concat(t, '" class="')
            .concat(t === a.difficulty ? "on" : "", '">')
            .concat(DIFFICULTY_LEVELS[t].label, "</button>"),
        )
        .join(""),
      '\n        </div>\n      </div>\n      <div class="field">Quarter length\n        <div class="seg" id="qlen">\n          ',
    )
    .concat(
      [60, 120, 180, 300]
        .map((t) =>
          '<button data-v="'
            .concat(t, '" class="')
            .concat(t === a.quarterLen ? "on" : "", '">')
            .concat(t / 60, " min</button>"),
        )
        .join(""),
      '\n        </div>\n      </div>\n      <div class="field">Defense switching\n        <div class="seg" id="dswitch">\n          <button data-v="auto" class="',
    )
    .concat(a.autoSwitch !== !1 ? "on" : "", '">Auto</button>\n          <button data-v="manual" class="')
    .concat(
      a.autoSwitch === !1 ? "on" : "",
      '">Manual</button>\n        </div>\n      </div>\n      <div class="field">Pre-game intro\n        <div class="seg" id="intro">\n          ',
    )
    .concat(
      [
        ["full", "Full"],
        ["quick", "Quick"],
        ["off", "Off"],
      ]
        .map(([t, s]) => {
          var n;
          return '<button data-v="'
            .concat(t, '" class="')
            .concat(t === ((n = a.introMode) != null ? n : "full") ? "on" : "", '">')
            .concat(s, "</button>");
        })
        .join(""),
      "\n        </div>\n      </div>\n      ",
    )
    .concat(
      e.subs
        ? '\n      <div class="field">Substitutions\n        <div class="seg" id="subs">\n          <button data-v="auto" class="'
            .concat(a.autoSubs !== !1 ? "on" : "", '">Auto</button>\n          <button data-v="manual" class="')
            .concat(a.autoSubs === !1 ? "on" : "", '">Manual</button>\n        </div>\n      </div>')
        : "",
      "\n    </div>",
    );
}
function pi(a, e, t) {
  const s = (n, o) => {
    const r = a.querySelector(n);
    r &&
      r.addEventListener("click", (i) => {
        const l = i.target.closest("button");
        l && (r.querySelectorAll("button").forEach((c) => c.classList.toggle("on", c === l)), o(l.dataset.v), t());
      });
  };
  (s("#difficulty", (n) => (e.difficulty = n)),
    s("#qlen", (n) => (e.quarterLen = Number(n))),
    s("#subs", (n) => (e.autoSubs = n === "auto")),
    s("#dswitch", (n) => (e.autoSwitch = n === "auto")),
    s("#intro", (n) => {
      zo(n) && (e.introMode = n);
    }));
}
const ze = [
    "Hold shoot, release on green: a perfect release never misses",
    "Shift + shoot near the rim to dunk",
    "Cover all five positions in your starting five for a +2 lineup bonus",
    "Type matchups apply when you shove: Fighting beats Rock, Water beats Fire",
    "Fill the special bar, then hit I or E for your Pokémon's signature move",
    "Draft a backup ENGINE_VERSION every position: starters tire and the bench steps in",
  ],
  Ut = [
    "<b>NEW</b> Season Draft: draft ten, sim a full season, share your team",
    "Franchise: 9-week seasons, badges, level-ups and evolutions",
    "Quick Play: draft five, pick a gym leader, tip off",
  ],
  Bo = "",
  Ae = "GQe9QiBBV4G6bRUCxx2JgKrzT7G7RD17FJquBWgVpump",
  Ho = "",
  Wo = 80 / 11;
function jo(a) {
  if (a)
    return '<div class="ticker static" aria-label="Game modes"><span class="tk-item">Season Draft</span><span class="tk-item">Franchise</span><span class="tk-item">Quick Play</span></div>';
  const e = (i, l) => '<span class="tk-item '.concat(i, '">').concat(l, "</span>"),
    t = (i) => e("tk-ad", '<b class="tk-tag">AD</b>'.concat(i)),
    s = [
      e("tk-live-item", '<b class="tk-tag">LIVE</b><span class="tk-live">warming up…</span>'),
      e("", '<b class="tk-tag">TIP</b>'.concat(ze[0])),
      e("", Ut[0]),
      e("", '<b class="tk-tag">TIP</b>'.concat(ze[1])),
      e("", Ut[1]),
      e("", '<b class="tk-tag">TIP</b>'.concat(ze[2])),
      e("", Ut[2]),
      e("", '<b class="tk-tag">TIP</b>'.concat(ze[3])),
      e("", '<b class="tk-tag">TIP</b>'.concat(ze[4])),
      e("", '<b class="tk-tag">TIP</b>'.concat(ze[5])),
    ],
    n = [];
  s.forEach((i, l) => {
    (n.push(i), l % 2 === 1 && n.push(t(Ho)));
  });
  const o = n.join(""),
    r = Math.round(n.length * Wo);
  return '<div class="ticker" role="marquee" aria-label="Live score, tips and game modes"><div class="tk-track" style="animation-duration:'
    .concat(r, 's"><div class="tk-run">')
    .concat(o, '</div><div class="tk-run" aria-hidden="true">')
    .concat(o, "</div></div></div>");
}
function yi(a, e, t, s) {
  var S, $;
  const n = Lo(),
    o = [...POKEMON_LIST].sort(() => Math.random() - 0.5).slice(0, 14);
  let r = null;
  const i = () => {
      (r == null || r.stop(), (r = null));
    },
    l =
      (D) =>
      (...R) => {
        const A = a.querySelector("#team-name");
        if (A && DRILL_TABLE(teamNameClean(A.value))) {
          (drillScore(A), A.focus());
          return;
        }
        (i(), D(...R));
      };
  let c = "draft";
  a.innerHTML = '\n    <div class="menu">\n      <div class="attract" aria-hidden="true">\n        '
    .concat(
      n
        ? '<div class="attract-static"><div class="parade">'.concat(
            o.map((D, R) => '<img src="'.concat(le(D.dex), '" alt="" style="--i:').concat(R, '">')).join(""),
            "</div></div>",
          )
        : '<canvas class="attract-canvas"></canvas>',
      '\n        <div class="attract-dim"></div>\n      </div>\n      <div class="menu-in">\n        <header class="title">\n          <h1 class="logo"><span class="logo-poke">POK\u00E9</span><span class="logo-jam">JAM</span></h1>\n          <p class="tag">\u6311\u9009\u7CBE\u7075\uFF0C\u51B2\u4E0A\u7403\u573A\u3002\u5168\u573A 5 \u5BF9 5 \u8857\u673A\u7BEE\u7403\u3002</p>\n        </header>\n        <div class="team-card showcase">\n          <button type="button" id="team-name" class="team-preset" title="\u70B9\u51FB\u66F4\u6362\u961F\u540D">\n            <span class="tc-swap">\u66F4\u6362</span>\n            <img class="tc-sprite" src="sprites/25.png" alt="" draggable="false">\n            <span class="tc-name">',
    )
    .concat(escapeHtml(teamNameClean(e.teamName)), "\n          </span>\n          </button>\n        </div>\n        ")
    .concat(
      s.drafted
        ? '<p class="mode-saved hero-saved"><span class="lbl">\u6211\u7684\u9009\u79C0\u961F</span> '.concat(
            escapeHtml(s.drafted),
            "</p>",
          )
        : "",
      '\n        <div class="menu-panel">\n          ',
      '<div class="mi-grid">\n            ',
    )
    .concat(
      s.saved
        ? '<button class="mi mi-hot" data-go="continue"><span class="mi-ico">\u{1f3c6}</span><span class="mi-txt"><b class="mi-t">\u7EE7\u7EED\u65E0\u5C3D</b><small class="mi-s">'.concat(
            escapeHtml(s.saved),
            "</small></span></button>",
          )
        : '<button class="mi mi-hot" data-go="new"><span class="mi-ico">\u{1f3c6}</span><span class="mi-txt"><b class="mi-t">\u65E0\u5C3D\u6A21\u5F0F</b><small class="mi-s">9 \u5468\u8D5B\u5B63 \u00B7 AI \u540C\u6B65\u6210\u957F</small></span></button>',
      '\n            <button class="mi" data-go="season"><span class="mi-ico">\u{1f95a}</span><span class="mi-txt"><b class="mi-t">\u9009\u79C0\u5E76\u8BC4\u5206</b><small class="mi-s">\u9009 10 \u4EBA \u00B7 \u6A21\u62DF\u4E00\u5B63 \u00B7 \u770B\u4F60\u7684\u8BC4\u5206</small></span></button>\n            <button class="mi" data-go="quick"><span class="mi-ico">\u26A1</span><span class="mi-txt"><b class="mi-t">\u5FEB\u901F\u6BD4\u8D5B</b><small class="mi-s">\u9009\u4E94\u4EBA\u6311\u9986\u4E3B\uFF0C\u7EAF\u8857\u673A</small></span></button>\n            <button class="mi" data-go="tutorial"><span class="mi-ico">\u{1f396}\uFE0F</span><span class="mi-txt"><b class="mi-t">\u6559\u7A0B</b><small class="mi-s">\u5F15\u5BFC\u8D70\u4E00\u904D \u00B7 \u9010\u9879\u6253\u5206\u8BC4\u4F30</small></span></button>\n            <button class="mi" data-go="roster"><span class="mi-ico">\u{1f4d6}</span><span class="mi-txt"><b class="mi-t">\u56FE\u9274</b><small class="mi-s">',
    )
    .concat(
      POKEMON_LIST.length,
      " \u53EA\u7CBE\u7075 \u00B7 \u80FD\u529B / \u4F4D\u7F6E / \u8FDB\u5316</small></span></button>\n          </div>\n          ",
    )
    .concat(
      s.saved
        ? '<button class="mi mi-ghost" data-go="new"><span class="mi-ico">\u2795</span><span class="mi-txt"><b class="mi-t">\u65B0\u5EFA\u751F\u6DAF</b><small class="mi-s">\u8986\u76D6\u5F53\u524D\u5B58\u6863\uFF0C\u91CD\u65B0\u5F00\u59CB</small></span></button>\n          '
        : "",
      '</div>\n        <details class="controls-fold menu-fold">\n          <summary>\u64CD\u4F5C\u4E0E\u8BF4\u660E</summary>\n          ',
    )
    .concat(
      Aa(),
      '\n          <footer class="foot">\n            <p>\u540C\u4EBA\u6E38\u620F\u3002\u7CBE\u7075\u53CA\u5176\u89D2\u8272\u662F Nintendo\u3001Game Freak \u4E0E The Pok\u00E9mon Company \u7684\u5546\u6807\u3002\u7CBE\u7075\u56FE\u6765\u81EA PokeAPI\u3002</p>\n            <p class="foot-links"><button class="link-btn" data-go="delete">\u5220\u9664\u672C\u673A\u5B58\u6863</button></p>\n            <p class="foot-status" role="status"></p>\n          </footer>\n        </details>\n      </div>\n      ',
    )
    .concat(jo(n), "\n    </div>");
  const h = (D) => a.querySelector(D),
    d = h(".attract-canvas");
  if (d) {
    const D = a.querySelectorAll(".tk-live");
    r = Oo(d, (A) => {
      const K = ""
        .concat(A.home, " ")
        .concat(A.score[0], " - ")
        .concat(A.score[1], " ")
        .concat(A.away, " · ")
        .concat(A.clock);
      D.forEach((Y) => (Y.textContent = K));
    });
  }
  const f = h("#team-name");
  f.addEventListener("click", () => {
    const zi = [
        "Pallet Stars",
        "Boulder Bulls",
        "Cascade Waves",
        "Thunder Bolts",
        "Rainbow Wings",
        "Ninja Squad",
        "Mind Masters",
        "Volcano Blaze",
        "Quake Giants",
        "Indigo Kings",
        "Pikachu United",
        "Dragon Aces",
      ].indexOf(e.teamName),
      D = [
        "Pallet Stars",
        "Boulder Bulls",
        "Cascade Waves",
        "Thunder Bolts",
        "Rainbow Wings",
        "Ninja Squad",
        "Mind Masters",
        "Volcano Blaze",
        "Quake Giants",
        "Indigo Kings",
        "Pikachu United",
        "Dragon Aces",
      ][(zi + 1) % 12];
    ((f.querySelector(".tc-name").textContent = D), DRILL_TABLE(D) || (e.teamName = D), t());
  });
  const u = h('[data-go="new"]');
  let m = !s.saved && !s.draft;
  const p = () => {
    if (m) return (window.__pjSetLine && window.__pjSetLine("endless"), l(s.onNew)(c));
    ((m = !0),
      (u.textContent = s.saved ? "Tap again to replace your franchise" : "Tap again to restart the draft"),
      u.classList.add("warn"));
  };
  const v = l(s.onQuick);
  (h('[data-go="quick"]').addEventListener("click", v),
    h('[data-go="tutorial"]').addEventListener("click", l(s.onTutorial)),
    h('[data-go="season"]').addEventListener("click", async () => {
      const D = s.confirmSeason ? await s.confirmSeason() : s.onSeason;
      D && l(D)();
    }),
    h('[data-go="roster"]').addEventListener("click", l(s.onRoster)),
    !1 && h('[data-go="multiplayer"]').addEventListener("click", l(s.onMultiplayer)),
    u.addEventListener("click", p),
    (S = h('[data-go="continue"]')) == null ||
      S.addEventListener("click", function () {
        (window.__pjSetLine && window.__pjSetLine("endless"), l(s.onContinue)());
      }));
  let k = 0;
  const w = h('[data-go="delete"]');
  let P = !1;
  w.addEventListener("click", () => {
    if (!P) {
      ((P = !0), (w.textContent = "Tap again to erase your franchise, draft and settings"), w.classList.add("warn"));
      return;
    }
    l(s.onDeleteData)();
  });
}
const is = {
    tipoff: ["tipoff"],
    heating: ["heating_1", "heating_2"],
    fire: ["fire_1", "fire_2"],
    cooled: ["cooled"],
    dunk: ["dunk_1", "dunk_2", "dunk_3", "dunk_4", "dunk_5"],
    three: ["three_1", "three_2", "three_3"],
    block: ["block_1", "block_2", "block_3"],
    steal: ["steal_1", "steal_2"],
    oop: ["oop"],
    airball: ["airball"],
    super: ["super"],
    buzzer: ["buzzer"],
    shotclock: ["shotclock"],
    q1: ["q1"],
    half: ["half"],
    q3: ["q3"],
    buildPlayer: ["buildPlayer"],
    final: ["final"],
    potg: ["potg_1", "potg_2", "potg_3"],
    lineups: ["lineups_1", "lineups_2"],
    yourfive: ["yourfive"],
  },
  ls = [...new Set(Object.values(is).flat())],
  Be = {
    final: 10,
    potg: 10,
    lineups: 10,
    yourfive: 10,
    buzzer: 9,
    tipoff: 8,
    q1: 8,
    half: 8,
    q3: 8,
    buildPlayer: 8,
    fire: 7,
    heating: 6,
    oop: 5,
    dunk: 4,
    three: 4,
    block: 4,
    super: 3,
    steal: 3,
    shotclock: 3,
    airball: 2,
    cooled: 1,
  },
  qo = 1.2,
  Uo = 0.06;
function _o(a) {
  switch (a.kind) {
    case "score":
      return a.how === "dunk" ? "dunk" : a.points === 3 ? "three" : null;
    case "miss":
      return a.airball ? "airball" : null;
    case "block":
      return "block";
    case "steal":
      return "steal";
    case "oop":
      return "oop";
    case "heating":
      return "heating";
    case "fire":
      return a.on ? "fire" : "cooled";
    case "special":
      return a.hits.some((e) => e.mult >= 2) ? "super" : null;
    case "buzzerbeater":
      return "buzzer";
    case "shotclock":
      return "shotclock";
    case "final":
      return "final";
    case "quarter":
      return a.label === "1ST QUARTER"
        ? "tipoff"
        : a.label === "END OF Q1"
          ? "q1"
          : a.label === "HALFTIME"
            ? "half"
            : a.label === "END OF Q3"
              ? "q3"
              : a.label === "END OF REGULATION"
                ? "buildPlayer"
                : null;
    default:
      return null;
  }
}
class Ca {
  constructor(e = Math.random) {
    ((this.rand = e),
      (this.busyUntil = -1 / 0),
      (this.speaking = null),
      (this.waiting = new Map()),
      (this.lastClip = new Map()));
  }
  next(e, t, s) {
    for (const i of e) {
      const l = _o(i);
      l && this.waiting.set(l, t);
    }
    for (const [i, l] of this.waiting) t - l > qo && this.waiting.delete(i);
    let n = null;
    for (const [i, l] of this.waiting) (!n || Be[i] > Be[n] || (Be[i] === Be[n] && l < this.waiting.get(n))) && (n = i);
    if (!n || (t < this.busyUntil && this.speaking && Be[n] < Be[this.speaking] + 3)) return null;
    this.waiting.delete(n);
    const o = is[n].filter((i) => is[n].length === 1 || i !== this.lastClip.get(n)),
      r = o[Math.floor(this.rand() * o.length) % o.length];
    return (this.lastClip.set(n, r), (this.speaking = n), (this.busyUntil = t + s(r) + Uo), { call: n, clip: r });
  }
}
const Ko = {
    Normal: "BODY SLAM",
    Fire: "FLARE BLITZ",
    Water: "WATERFALL",
    Electric: "THUNDER PUNCH",
    Grass: "WOOD HAMMER",
    Ice: "ICICLE CRASH",
    Fighting: "SKY UPPERCUT",
    Poison: "POISON JAB",
    Ground: "HIGH HORSEPOWER",
    Flying: "BRAVE BIRD",
    Psychic: "ZEN HEADBUTT",
    Bug: "MEGAHORN",
    Rock: "HEAD SMASH",
    Ghost: "SHADOW CLAW",
    Dragon: "DRAGON RUSH",
    Dark: "CRUNCH",
    Steel: "METEOR MASH",
    Fairy: "PLAY ROUGH",
  },
  Vo = {
    perfect: ["EXCELLENT", "green"],
    good: ["GOOD RELEASE", "white"],
    early: ["SLIGHTLY EARLY", "yellow"],
    late: ["SLIGHTLY LATE", "yellow"],
    "very-early": ["VERY EARLY", "red"],
    "very-late": ["VERY LATE", "red"],
    layup: ["", "white"],
    dunk: ["", "white"],
  },
  Yo = (a) => {
    const e = Math.max(0, a);
    if (e < 10) return e.toFixed(1);
    const t = Math.floor(e / 60);
    return "".concat(t, ":").concat(String(Math.floor(e % 60)).padStart(2, "0"));
  },
  U = (a) => a.mon.name.toUpperCase();
class Ga {
  constructor(e, t, s = {}) {
    var i;
    ((this.g = t),
      (this.msgs = []),
      (this.msgT = 0),
      (this.bannerT = 0),
      (this.gradeT = 0),
      (this.cardDex = -1),
      (this.last = {}));
    const [n, o] = t.teams,
      r = document.createElement("div");
    if (
      ((r.className = "hud"),
      (r.innerHTML = '\n      <div class="bug">\n        <div class="bug-team" style="--tc:'
        .concat(n.color, '"><span class="abbr">')
        .concat(
          escapeHtml(n.abbr),
          '</span><span class="pts" data-k="s0">0</span></div>\n        <div class="bug-team" style="--tc:',
        )
        .concat(o.color, '"><span class="abbr">')
        .concat(
          escapeHtml(o.abbr),
          '</span><span class="pts" data-k="s1">0</span></div>\n        <div class="bug-clock"><span data-k="q">1ST</span><span data-k="clock">0:00</span></div>\n        <div class="bug-shot" data-k="shot">24</div>\n      </div>\n      <div class="grade" data-k="grade"></div>\n      <div class="banner" data-k="banner"><div class="banner-main"></div><div class="banner-sub"></div></div>\n      <div class="pcard" data-k="pcard">\n        <img alt="" data-k="pimg">\n        <div class="pinfo">\n          <div class="pname"><span data-k="pname"></span><span class="povr" data-k="povr"></span></div>\n          <div class="bar turbo"><i data-k="turbo"></i><b>TURBO</b></div>\n          <div class="bar spec"><i data-k="spec"></i><b data-k="specname">SPECIAL</b></div>\n          ',
        )
        .concat(
          t.cfg.stamina ? '<div class="bar energy"><i data-k="energy"></i><b>ENERGY</b></div>' : "",
          '\n        </div>\n      </div>\n      <div class="battle" data-k="battle"><p data-k="msg"></p></div>',
        )),
      e.appendChild(r),
      (this.el = r),
      (this.q = (l) => r.querySelector('[data-k="'.concat(l, '"]'))),
      !t.isHumanTeam(t.viewTeam))
    )
      this.q("pcard").hidden = !0;
    else if (s.intro !== !1) {
      const l = t.players.find((d) => d.team === t.viewTeam && d.slot === 0),
        c = (i = t.tipoff) == null ? void 0 : i.jumpers[t.viewTeam],
        h = t.teams[1 - t.viewTeam];
      this.say(
        h.coach
          ? "".concat(h.coach.toUpperCase(), " wants to ball!")
          : "Wild ".concat(h.name.toUpperCase(), " appeared!"),
        c ? "Go! ".concat(U(c), "! Hit SHOOT when the toss peaks!") : "Go! ".concat(U(l), " and crew!"),
      );
    }
  }
  set(e, t) {
    this.last[e] !== t && ((this.last[e] = t), (this.q(e).textContent = t));
  }
  say(...e) {
    for (const t of e) this.msgs.push(t);
    this.msgs.length > 4 && this.msgs.splice(0, this.msgs.length - 4);
  }
  banner(e, t = "", s = 2) {
    const n = this.q("banner");
    ((n.querySelector(".banner-main").textContent = e),
      (n.querySelector(".banner-sub").textContent = t),
      n.classList.remove("show"),
      n.offsetWidth,
      n.classList.add("show"),
      (this.bannerT = s));
  }
  handle(e) {
    for (const t of e)
      switch (t.kind) {
        case "score": {
          const s = t.player.team === 0 ? "s0" : "s1",
            n = this.q(s);
          (n.classList.remove("pts-flash"),
            n.offsetWidth,
            n.classList.add("pts-flash"),
            t.how === "dunk"
              ? this.say(
                  "".concat(U(t.player), " used ").concat(Ko[t.player.mon.types[0]], "!"),
                  "It's super effective!",
                )
              : t.points === 3 && this.say("".concat(U(t.player), " drains a three!")));
          break;
        }
        case "miss":
          t.airball && this.say("AIRBALL! ".concat(U(t.player), " hurt itself in its confusion!"));
          break;
        case "release":
          if (t.player.human && t.player.team === this.g.viewTeam) {
            const [s, n] = Vo[t.grade],
              o = this.q("grade");
            ((o.textContent = s),
              (o.dataset.c = n),
              o.classList.remove("show"),
              o.offsetWidth,
              o.classList.add("show"),
              (this.gradeT = 1.2));
          }
          break;
        case "block":
          this.say("".concat(U(t.player), " used PROTECT!"), "".concat(U(t.victim), "'s shot was rejected!"));
          break;
        case "steal":
          this.say("".concat(U(t.player), " used THIEF!"), "".concat(U(t.player), " stole the ball!"));
          break;
        case "shove":
          t.mult === 0
            ? this.say("".concat(U(t.player), " used TACKLE!"), "It doesn't affect ".concat(U(t.victim), "..."))
            : t.ok
              ? t.mult >= 2
                ? this.say("".concat(U(t.player), " used TACKLE!"), "It's super effective!")
                : t.mult < 1
                  ? this.say("".concat(U(t.player), " used TACKLE!"), "It's not very effective...")
                  : this.say("".concat(U(t.player), " used TACKLE!"))
              : this.say("".concat(U(t.player), " used TACKLE!"), "".concat(U(t.player), "'s attack missed!"));
          break;
        case "special": {
          const s = ["".concat(U(t.player), " used ").concat(t.player.mon.move, "!")],
            n = t.hits.find((o) => o.mult === 0);
          (t.hits.some((o) => o.mult >= 2)
            ? s.push("It's super effective!")
            : t.hits.length && t.hits.every((o) => o.mult > 0 && o.mult < 1) && s.push("It's not very effective..."),
            n && s.push("It doesn't affect ".concat(U(n.victim), "...")),
            this.say(...s));
          break;
        }
        case "heating":
          this.say("".concat(U(t.player), " is heating up!"));
          break;
        case "fire":
          t.on
            ? this.banner("".concat(U(t.player)), "IS ON FIRE!", 2.2)
            : this.say("".concat(U(t.player), " cooled off."));
          break;
        case "sub": {
          const s = this.g.teams[t.in.team].coach;
          t.in.team === 0 && this.g.isHumanTeam(0)
            ? this.say("Come back, ".concat(U(t.out), "!"), "Go! ".concat(U(t.in), "!"))
            : this.say(
                ""
                  .concat((s != null ? s : this.g.teams[t.in.team].name).toUpperCase(), " sent out ")
                  .concat(U(t.in), "!"),
              );
          break;
        }
        case "injury":
          this.say(
            "".concat(U(t.player), " is hurt!"),
            "Out ".concat(t.weeks, " week").concat(t.weeks > 1 ? "s" : "", "."),
          );
          break;
        case "subQueued":
          this.say("".concat(U(t.in), " checks in for ").concat(U(t.out), " ENGINE_VERSION the next dead ball."));
          break;
        case "oop":
          this.say("ALLEY-OOP to ".concat(U(t.player), "!"));
          break;
        case "shotclock":
          this.say("SHOT CLOCK VIOLATION!");
          break;
        case "quarter":
          this.banner(t.label, t.sub, 2.2);
          break;
        case "buzzerbeater":
          (this.banner("BUZZER BEATER!", "".concat(U(t.player), " AT THE HORN"), 2.4),
            this.say("".concat(U(t.player), " beats the buzzer!"), "It's super effective!"));
          break;
        case "jumpball":
          this.say(
            "".concat(U(t.winner), " wins the tip over ").concat(U(t.loser), "!"),
            "".concat(this.g.teams[t.winner.team].abbr, " ball."),
          );
          break;
        case "final":
          this.banner(
            "FINAL",
            ""
              .concat(this.g.teams[0].abbr, " ")
              .concat(this.g.score[0], " - ")
              .concat(this.g.score[1], " ")
              .concat(this.g.teams[1].abbr),
            3,
          );
          break;
      }
  }
  update(e) {
    const t = this.g;
    (this.set("s0", String(t.score[0])), this.set("s1", String(t.score[1])));
    const s =
      t.quarter > 4
        ? t.quarter === 5
          ? "OT"
          : "".concat(t.quarter - 4, "OT")
        : ["1ST", "2ND", "3RD", "4TH"][t.quarter - 1];
    (this.set("q", s),
      this.set("clock", Yo(t.clock)),
      this.set("shot", String(Math.max(0, Math.ceil(t.shotClock)))),
      this.q("shot").classList.toggle("low", t.shotClock < 5));
    const n = t.user;
    if (n) {
      if (
        (this.cardDex !== n.mon.dex &&
          ((this.cardDex = n.mon.dex),
          (this.q("pimg").src = le(n.mon.dex)),
          this.set("pname", n.mon.name.toUpperCase()),
          this.set("povr", "".concat(n.mon.pos, " ").concat(n.mon.ovr)),
          this.set("specname", n.mon.move)),
        (this.q("turbo").style.width = "".concat((n.fx.surge > 0 || n.fire ? 1 : n.turbo) * 100, "%")),
        (this.q("spec").style.width = "".concat(n.special * 100, "%")),
        this.g.cfg.stamina)
      ) {
        const o = this.q("energy");
        ((o.style.width = "".concat(n.energy * 100, "%")), o.classList.toggle("low", n.energy < 0.5));
      }
      (this.q("pcard").classList.toggle("ready", n.special >= 1), this.q("pcard").classList.toggle("fire", n.fire));
    }
    if (((this.msgT -= e), this.msgT <= 0)) {
      const o = this.msgs.shift(),
        r = this.q("battle");
      o
        ? (this.set("msg", o), r.classList.add("show"), (this.msgT = 1.5))
        : (r.classList.remove("show"), (this.msgT = 0));
    }
    ((this.bannerT -= e),
      this.bannerT <= 0 && this.q("banner").classList.remove("show"),
      (this.gradeT -= e),
      this.gradeT <= 0 && this.q("grade").classList.remove("show"));
  }
}
const INPUT_BITS = { turbo: 1, shoot: 2, shootHeld: 4, pass: 8, steal: 16, special: 32, swap: 64 },
  Ct = (a) => Math.round(Math.max(-1, Math.min(1, a)) * 100) / 100;
function Jo(a) {
  let e = 0;
  for (const t of Object.keys(INPUT_BITS)) a[t] && (e |= INPUT_BITS[t]);
  return { mx: Ct(a.mx), my: Ct(a.my), b: e };
}
function Gt(a) {
  const e = makeEmptyInput();
  if (!a) return e;
  ((e.mx = Ct(Number(a.mx) || 0)), (e.my = Ct(Number(a.my) || 0)));
  const t = Number(a.b) | 0;
  for (const s of Object.keys(INPUT_BITS)) e[s] = (t & INPUT_BITS[s]) !== 0;
  return e;
}
const FRAME_DELTA = 1 / 60;
function bi(a, e) {
  ((a.inputs = [Gt(e[0]), Gt(e[1])]), a.update(FRAME_DELTA));
}
function La(a) {
  let e = 2166136261;
  const t = (n) => {
    const o = Number.isFinite(n) ? Math.round(n * 1e3) : n > 0 ? 1e12 : -1e12;
    for (const r of [o | 0, Math.floor(o / 4294967296) | 0]) ((e ^= r), (e = Math.imul(e, 16777619) >>> 0));
  };
  (t(a.engineVersion), t(a.score[0]), t(a.score[1]), t(a.quarter), t(a.clock), t(a.shotClock), t(a.rng.state));
  const s = a.ball;
  (t(s.x), t(s.y), t(s.z), t(s.owner ? s.owner.id : -1));
  for (const n of a.players) (t(n.id), t(n.x), t(n.y), t(n.z), t(n.special));
  return e >>> 0;
}
const Qo = new Set([
    "cfg",
    "teams",
    "diff",
    "seed",
    "engineVersion",
    "rng",
    "vsCpu",
    "events",
    "sfx",
    "viewTeam",
    "paused",
  ]),
  Xo = (a) => "stats" in a && "ai" in a && "mon" in a && "team" in a;
function Pe(a, e = !1) {
  if (a === null || typeof a != "object") return typeof a == "number" && !Number.isFinite(a) ? { $f: String(a) } : a;
  if (a instanceof Set) return { $set: [...a].map((s) => Pe(s)) };
  if (a instanceof Map) return { $map: [...a].map(([s, n]) => [Pe(s), Pe(n)]) };
  if (Array.isArray(a)) return a.map((s) => Pe(s, e));
  if (Xo(a) && !e) return { $p: a.id };
  const t = {};
  for (const [s, n] of Object.entries(a)) (e && s === "mon") || (typeof n != "function" && (t[s] = Pe(n)));
  return t;
}
function Ge(a, e) {
  var n;
  if (a === null || typeof a != "object") return a;
  if (Array.isArray(a)) return a.map((o) => Ge(o, e));
  const t = a;
  if ("$p" in t) return (n = e.get(t.$p)) != null ? n : null;
  if ("$f" in t) return Number(t.$f);
  if ("$set" in t) return new Set(t.$set.map((o) => Ge(o, e)));
  if ("$map" in t) return new Map(t.$map.map(([o, r]) => [Ge(o, e), Ge(r, e)]));
  const s = {};
  for (const [o, r] of Object.entries(t)) s[o] = Ge(r, e);
  return s;
}
function Zo(a) {
  const e = {};
  for (const [t, s] of Object.entries(a))
    Qo.has(t) || t === "players" || t === "bench" || typeof s == "function" || (e[t] = Pe(s));
  return {
    engine: a.engineVersion,
    rng: a.rng.state,
    game: e,
    players: a.players.map((t) => Pe(t, !0)),
    bench: a.bench.map((t) => Pe(t, !0)),
  };
}
function er(a, e) {
  if (e.engine !== ENGINE_VERSION) throw new Error("snapshot is from engine v".concat(e.engine, ", this is engine v").concat(ENGINE_VERSION));
  const t = new Map();
  for (const i of [...a.players, ...a.bench]) t.set(i.id, i);
  const s = (i) =>
      i.map((l) => {
        const c = t.get(l.id);
        if (!c) throw new Error("snapshot has unknown player ".concat(String(l.id)));
        return (Object.assign(c, Ge(l, t)), c);
      }),
    n = s(e.players),
    o = s(e.bench),
    r = a;
  for (const [i, l] of Object.entries(e.game)) r[i] = Ge(l, t);
  ((a.players = n), (a.bench = o), (a.rng.state = e.rng), (a.events.length = 0), (a.sfx.length = 0));
}
const _t = 120,
  tr = 30,
  Ys = 4.5,
  sr = 2,
  ar = {
    dunk: "SLAM DUNK",
    oop: "ALLEY-OOP SLAM",
    three: "FROM DOWNTOWN",
    buzzer: "BUZZER BEATER",
    block: "REJECTED",
    steal: "PICKPOCKET",
    fire: "ON FIRE",
    special: "SUPER EFFECTIVE",
  },
  nr = { buzzer: 90, oop: 55, fire: 38, dunk: 32, three: 28, block: 26, special: 22, steal: 14 };
class or {
  constructor(e, t) {
    ((this.cfg = e),
      (this.seed = t),
      (this.tick = 0),
      (this.log = []),
      (this.snaps = new Map()),
      (this.hashes = new Map()),
      (this.candidates = []),
      (this.lastOop = new Map()),
      (this.pendingSubs = []),
      (this.leader = null),
      (this.lastLeadChange = -1));
  }
  before(e, t) {
    this.tick % _t === 0 && this.snaps.set(this.tick, { s: Zo(e), autoSubs: e.cfg.userAutoSubs });
    const s = Jo(t);
    return (
      (this.log[this.tick] = { input: s, subs: this.pendingSubs.splice(0), autoSubs: this.pendingAuto }),
      (this.pendingAuto = void 0),
      Gt(s)
    );
  }
  sub(e, t) {
    this.pendingSubs.push([e.id, t.id]);
  }
  autoSubs(e) {
    this.pendingAuto = e;
  }
  after(e, t) {
    (this.tick++, this.tick % tr === 0 && this.hashes.set(this.tick, La(e)));
    const s = e.score[0] === e.score[1] ? null : e.score[0] > e.score[1] ? 0 : 1;
    (s !== this.leader && s !== null && (this.lastLeadChange = this.tick), (this.leader = s));
    for (const n of t) this.consider(e, n);
  }
  consider(e, t) {
    var n;
    const s = (o, r, i = 0) => {
      const l = e.quarter >= 4 && e.clock <= 30;
      this.candidates.push({
        kind: o,
        tick: this.tick,
        team: r.team,
        playerId: r.id,
        name: r.mon.name.toUpperCase(),
        title: ar[o],
        value: nr[o] + i,
        score: [e.score[0], e.score[1]],
        late: l,
      });
    };
    if (t.kind === "oop") this.lastOop.set(t.player.id, this.tick);
    else if (t.kind === "score")
      t.how === "dunk" && this.tick - ((n = this.lastOop.get(t.player.id)) != null ? n : -1e9) < 90
        ? s("oop", t.player, t.player.fire ? 8 : 0)
        : t.how === "dunk"
          ? s("dunk", t.player, t.player.fire ? 8 : 0)
          : t.points === 3 && s("three", t.player, t.player.fire ? 8 : 0);
    else if (t.kind === "buzzerbeater") {
      const o = this.candidates.findIndex((r) => r.tick === this.tick && r.playerId === t.player.id);
      (o >= 0 && this.candidates.splice(o, 1), s("buzzer", t.player, t.points === 3 ? 10 : 0));
    } else
      t.kind === "block"
        ? s("block", t.player)
        : t.kind === "steal"
          ? s("steal", t.player)
          : t.kind === "fire" && t.on
            ? s("fire", t.player)
            : t.kind === "special" && t.hits.some((o) => o.mult >= 2) && s("special", t.player, 4 * t.hits.length);
  }
  best(e) {
    const t = e.score[0] === e.score[1] ? null : e.score[0] > e.score[1] ? 0 : 1,
      s = [0, 1].find((i) => e.isHumanTeam(i)),
      n = (i) =>
        i.late &&
        i.team === t &&
        i.tick === this.lastLeadChange &&
        i.kind !== "block" &&
        i.kind !== "steal" &&
        i.kind !== "fire";
    let o = null,
      r = -1;
    for (const i of this.candidates) {
      if (i.tick < (Ys / FRAME_DELTA) * 0.4) continue;
      let l = i.value;
      (n(i) ? (l += 45) : i.late && (l += 12),
        s !== void 0 && i.team === s && (l *= 1.5),
        (l > r || (l === r && o && i.tick > o.tick)) && ((o = i), (r = l)));
    }
    return o ? { ...o, value: r, title: n(o) ? "GAME WINNER · ".concat(o.title) : o.title } : null;
  }
  clip(e) {
    const t = Math.max(0, e.tick - Math.round(Ys / FRAME_DELTA)),
      s = Math.min(this.tick, e.tick + Math.round(sr / FRAME_DELTA)),
      n = Math.floor(t / _t) * _t,
      o = this.snaps.get(n);
    if (!o) return null;
    try {
      const r = new MatchEngine({ ...this.cfg, seed: this.seed, userAutoSubs: o.autoSubs });
      er(r, JSON.parse(JSON.stringify(o.s)));
      const i = new rr(r, this.log, this.hashes, n, t, e.tick, s);
      for (; i.tick < t;) i.step();
      return ((r.events.length = 0), (r.sfx.length = 0), i.ok ? i : null);
    } catch {
      return null;
    }
  }
}
class rr {
  constructor(e, t, s, n, o, r, i) {
    ((this.game = e),
      (this.log = t),
      (this.hashes = s),
      (this.tick = n),
      (this.start = o),
      (this.moment = r),
      (this.end = i),
      (this.ok = !0));
  }
  get done() {
    return this.tick >= this.end || !this.ok;
  }
  step() {
    const e = this.game,
      t = this.log[this.tick];
    if (!t) {
      this.ok = !1;
      return;
    }
    t.autoSubs !== void 0 && (e.cfg.userAutoSubs = t.autoSubs);
    for (const [n, o] of t.subs) {
      const r = [...e.players, ...e.bench],
        i = r.find((c) => c.id === n),
        l = r.find((c) => c.id === o);
      i && l && e.requestSub(i, l);
    }
    ((e.userInput = Gt(t.input)), e.update(FRAME_DELTA), this.tick++);
    const s = this.hashes.get(this.tick);
    s !== void 0 && s !== La(e) && (this.ok = !1);
  }
}
const Ia = {
    KeyJ: "shoot",
    Space: "shoot",
    KeyK: "pass",
    KeyL: "steal",
    ShiftLeft: "turbo",
    ShiftRight: "turbo",
    KeyI: "special",
    KeyE: "special",
    KeyP: "pause",
    Escape: "pause",
  },
  ir = new Set([
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "Space",
    "KeyW",
    "KeyA",
    "KeyS",
    "KeyD",
    ...Object.keys(Ia),
  ]);
class lr {
  constructor() {
    ((this.keys = new Set()),
      (this.touchBtn = { shoot: !1, pass: !1, steal: !1, turbo: !1, special: !1, pause: !1 }),
      (this.touchMove = { x: 0, y: 0 }),
      (this.prev = { shoot: !1, pass: !1, steal: !1, turbo: !1, special: !1, pause: !1 }),
      (this.touchRoot = null),
      (this.labels = {}),
      (this.enabled = !0),
      (this.onKey = (e) => {
        this.enabled &&
          (ir.has(e.code) && e.preventDefault(),
          e.type === "keydown" ? this.keys.add(e.code) : this.keys.delete(e.code));
      }),
      window.addEventListener("keydown", this.onKey, { passive: !1 }),
      window.addEventListener("keyup", this.onKey, { passive: !1 }),
      window.addEventListener("blur", () => this.keys.clear()));
  }
  destroy() {
    var e;
    (window.removeEventListener("keydown", this.onKey),
      window.removeEventListener("keyup", this.onKey),
      (e = this.touchRoot) == null || e.remove());
  }
  held() {
    var i, l, c, h;
    const e = this.keys,
      t = { ...this.touchBtn };
    for (const [d, f] of Object.entries(Ia)) e.has(d) && (t[f] = !0);
    let s = (e.has("KeyD") || e.has("ArrowRight") ? 1 : 0) - (e.has("KeyA") || e.has("ArrowLeft") ? 1 : 0),
      n = (e.has("KeyS") || e.has("ArrowDown") ? 1 : 0) - (e.has("KeyW") || e.has("ArrowUp") ? 1 : 0);
    ((s += this.touchMove.x), (n += this.touchMove.y));
    const o = (l = (i = navigator.getGamepads) == null ? void 0 : i.call(navigator)) != null ? l : [];
    for (const d of o) {
      if (!d) continue;
      const f = (c = d.axes[0]) != null ? c : 0,
        u = (h = d.axes[1]) != null ? h : 0;
      Math.hypot(f, u) > 0.25 && ((s += f), (n += u));
      const m = (p) => {
        var y;
        return !!((y = d.buttons[p]) != null && y.pressed);
      };
      (m(12) && (n -= 1),
        m(13) && (n += 1),
        m(14) && (s -= 1),
        m(15) && (s += 1),
        m(0) && (t.pass = !0),
        m(2) && (t.shoot = !0),
        m(1) && (t.steal = !0),
        m(3) && (t.special = !0),
        (m(4) || m(5) || m(6) || m(7)) && (t.turbo = !0),
        m(9) && (t.pause = !0));
    }
    const r = Math.hypot(s, n);
    return (r > 1 && ((s /= r), (n /= r)), { ...t, mx: s, my: n });
  }
  read() {
    const e = this.held(),
      t = (o) => e[o] && !this.prev[o],
      s = makeEmptyInput();
    ((s.mx = e.mx),
      (s.my = e.my),
      (s.turbo = e.turbo),
      (s.shoot = t("shoot")),
      (s.shootHeld = e.shoot),
      (s.pass = t("pass")),
      (s.swap = s.pass),
      (s.steal = t("steal")),
      (s.special = t("special")));
    const n = t("pause");
    for (const o of Object.keys(this.prev)) this.prev[o] = e[o];
    return { intent: s, pause: n };
  }
  setContext(e, t) {
    var n, o;
    const s = this.labels;
    (s.shoot && (s.shoot.textContent = e ? "SHOOT" : "JUMP"),
      s.pass && (s.pass.textContent = e ? "PASS" : "SWITCH"),
      (o = (n = s.special) == null ? void 0 : n.closest(".tb")) == null || o.classList.toggle("ready", t));
  }
  attachTouch(e) {
    const t = document.createElement("div");
    ((t.className = "touch"),
      (t.innerHTML =
        '\n      <div class="stick-zone"><div class="stick-base"><div class="stick-knob"></div></div></div>\n      <div class="btns">\n        <button class="tb turbo" data-b="turbo"><b>RB</b><span>加速</span></button>\n        <button class="tb special xy" data-b="special"><b>Y</b><span>必杀</span></button>\n        <button class="tb shoot xx" data-b="shoot"><b>X</b><span>投篮</span></button>\n        <button class="tb steal xb" data-b="steal"><b>B</b><span>抢断</span></button>\n        <button class="tb pass xa" data-b="pass"><b>A</b><span>传球</span></button>\n      </div>'),
      e.appendChild(t),
      (this.touchRoot = t),
      t.querySelectorAll(".tb").forEach((d) => {
        var p;
        const f = d.dataset.b;
        this.labels[f] = (p = d.querySelector("span")) != null ? p : d;
        const u = (y) => {
            (y.preventDefault(), d.setPointerCapture(y.pointerId), (this.touchBtn[f] = !0), d.classList.add("on"));
          },
          m = (y) => {
            (y.preventDefault(), (this.touchBtn[f] = !1), d.classList.remove("on"));
          };
        (d.addEventListener("pointerdown", u),
          d.addEventListener("pointerup", m),
          d.addEventListener("pointercancel", m),
          d.addEventListener("contextmenu", (y) => y.preventDefault()));
      }));
    const s = t.querySelector(".stick-zone"),
      n = t.querySelector(".stick-base"),
      o = t.querySelector(".stick-knob");
    let r = null,
      i = 0,
      l = 0;
    const c = 46;
    (s.addEventListener("pointerdown", (d) => {
      (d.preventDefault(), (r = d.pointerId), s.setPointerCapture(r));
      const f = s.getBoundingClientRect();
      ((i = d.clientX),
        (l = d.clientY),
        (n.style.left = "".concat(i - f.left, "px")),
        (n.style.top = "".concat(l - f.top, "px")),
        n.classList.add("on"));
    }),
      s.addEventListener("pointermove", (d) => {
        if (d.pointerId !== r) return;
        let f = d.clientX - i,
          u = d.clientY - l;
        const m = Math.hypot(f, u);
        (m > c && ((f = (f / m) * c), (u = (u / m) * c)),
          (o.style.transform = "translate(".concat(f, "px, ").concat(u, "px)")));
        const p = Math.hypot(f, u) / c;
        this.touchMove = p < 0.15 ? { x: 0, y: 0 } : { x: f / c, y: u / c };
      }));
    const h = (d) => {
      d.pointerId === r &&
        ((r = null), (this.touchMove = { x: 0, y: 0 }), (o.style.transform = ""), n.classList.remove("on"));
    };
    (s.addEventListener("pointerup", h), s.addEventListener("pointercancel", h));
  }
}
const cr = 1.7,
  hr = 0.9,
  ur = 0.45,
  fr = -100,
  cs = -66,
  hs = 20,
  Oa = 48,
  vt = 0.22,
  dr = 0.35,
  us = { wide: { follow: 1.35, moment: 2.15, after: 1.6 }, compact: { follow: 1.22, moment: 1.8, after: 1.4 } },
  mr = 760,
  Js = 0.22,
  pr = 0.4;
let Kt = "";
function yr(a) {
  if (a) return "potg_3";
  const e = ["potg_1", "potg_2"].filter((t) => t !== Kt);
  return ((Kt = e[Math.floor(Math.random() * e.length)]), Kt);
}
const it = (a, e, t) => {
  const s = Math.max(0, Math.min(1, (t - a) / (e - a)));
  return s * s * (3 - 2 * s);
};
function br(a) {
  return a < cs ? 1 - (1 - vt) * it(fr, cs, a) : a <= hs ? vt : vt + (1 - vt) * it(hs, Oa, a);
}
function gr(a, e = us.wide) {
  return a < 0
    ? e.follow + (e.moment - e.follow) * it(cs - 20, -6, a)
    : e.moment + (e.after - e.moment) * it(hs, Oa + 30, a);
}
function vr(a) {
  return a > 0 && a < mr ? us.compact : us.wide;
}
function Ra(a, e, t, s, n, o, r, i = {}) {
  var J;
  const l = t.game,
    c = new gs(e);
  (c.snap(l), (c.showUser = !1));
  const h = () => {
      var g;
      return vr(((g = e.parentElement) != null ? g : e).getBoundingClientRect().width);
    },
    d = new Ga(a, l, { intro: !1 });
  d.el.classList.add("potg-hud");
  const f = new Ca();
  r.load(ls);
  const u = document.createElement("div");
  ((u.className = "potg"),
    (u.innerHTML =
      '\n    <div class="potg-bar top"></div><div class="potg-bar bottom"></div>\n    <div class="potg-tag"><i></i>REPLAY</div>\n    <div class="potg-card">\n      <small>PLAY OF THE GAME</small>\n      <strong>'
        .concat(escapeHtml(s.name), "</strong>\n      <span>")
        .concat(escapeHtml(s.title), " · ")
        .concat(
          escapeHtml(n.toUpperCase()),
          '</span>\n    </div>\n    <button class="potg-skip" type="button">Skip ▸</button>\n    <div class="potg-flash"></div>\n    <div class="potg-fade"></div>',
        )),
    ((J = e.parentElement) != null ? J : a).appendChild(u),
    a.classList.add("potg-on"));
  const m = u.querySelector(".potg-fade"),
    p = u.querySelector(".potg-flash"),
    y = yr(!!i.again),
    v = Math.max(cr, r.length(y) + 0.2);
  r.say(y);
  let b = 0,
    k = 0,
    w = -1,
    P = !1,
    S = 0,
    $ = !1,
    D = 0;
  const R = { zoom: 1, x: ce / 2, y: Le / 2 },
    A = () => {
      P || ((P = !0), u.remove(), d.el.remove(), (e.style.transform = ""), a.classList.remove("potg-on"));
    };
  (u.querySelector(".potg-skip").addEventListener("click", (g) => {
    (g.stopPropagation(), A());
  }),
    requestAnimationFrame(() => u.classList.add("in")));
  const K = () => {
      const g = [...l.players, ...l.bench].find((M) => M.id === s.playerId),
        E = l.ball,
        C = c.screenOf(E.x, E.y, E.z);
      if (!g) return C;
      const G = c.screenOf(g.x, g.y, g.z + 3),
        I = E.owner === g ? 0.3 : t.tick < t.moment ? 0.7 : 0.8;
      return { x: G.x + (C.x - G.x) * I, y: G.y + (C.y - G.y) * I };
    },
    Y = (g) => {
      const E = t.tick - t.moment,
        C = b >= v,
        G = h(),
        I = (C ? gr(E, G) : 1 + (G.follow - 1) * it(0, v, b) * 0.35) + D,
        M = K(),
        O = 1 - Math.exp(-g * (E > -20 && E < 10 ? 7 : 3.5));
      ((R.zoom += (I - R.zoom) * O), (R.x += (M.x - R.x) * O), (R.y += (M.y - R.y) * O));
      const _ = ce / (2 * R.zoom),
        te = Le / (2 * R.zoom),
        j = Math.max(_, Math.min(ce - _, R.x)),
        be = Math.max(te, Math.min(Le - te, R.y));
      e.style.transform = "scale("
        .concat(R.zoom.toFixed(4), ") translate(")
        .concat(((0.5 - j / ce) * 100).toFixed(3), "%, ")
        .concat(((0.5 - be / Le) * 100).toFixed(3), "%)");
    };
  return {
    skip: A,
    frame(g) {
      if (P) return !1;
      b += g;
      let E = 0;
      if (((D = Math.max(0, D - (Js / pr) * g)), b >= v && !t.done)) {
        u.classList.add("rolling");
        const C = t.tick - t.moment,
          G = br(C);
        if ((u.classList.toggle("slow", G < 0.6), S > 0)) S -= g;
        else
          for (k += g * G; k >= FRAME_DELTA && !t.done;)
            if ((t.step(), (k -= FRAME_DELTA), (E += FRAME_DELTA), !$ && t.tick >= t.moment)) {
              (($ = !0), (S = dr), (D = Js), (k = 0), p.classList.remove("go"), p.offsetWidth, p.classList.add("go"));
              break;
            }
        const I = l.events.splice(0);
        (d.handle(I), c.handle(I, l));
        const M = l.sfx.splice(0);
        for (const te of M) o.play(te);
        const O = ys.hornDelay(M),
          _ = f.next(I, l.time, (te) => O + r.length(te));
        _ && r.say(_.clip, O);
      }
      if ((t.done && w < 0 && (w = b), w >= 0)) {
        const C = (b - w - hr) / ur;
        if (((m.style.opacity = String(Math.max(0, Math.min(1, C)))), C >= 1)) return (A(), !1);
      }
      return (c.draw(l, E || (b < v || S > 0 ? 0 : g * 0.2)), d.update(E), Y(g), !0);
    },
  };
}
const ks = new WeakMap();
function kr(a, e) {
  ks.set(a, e);
}
function gi(a) {
  var e, t;
  return (t = (e = ks.get(a)) == null ? void 0 : e.best) != null ? t : null;
}
function vi(a) {
  const e = ks.get(a),
    t = e && e.rec.clip(e.best);
  if (!e || !t) return;
  const s = document.createElement("div");
  ((s.className = "game potg-modal"),
    (s.innerHTML = '<div class="stage"><canvas class="court" aria-label="Replay"></canvas></div>'),
    document.body.appendChild(s));
  const n = Ra(s, s.querySelector("canvas"), t, e.best, e.teamName, e.audio, e.voice, { again: !0 }),
    o = (l) => {
      ["Escape", "Space", "Enter", "KeyJ", "KeyK", "KeyP"].includes(l.code) && (l.preventDefault(), n.skip());
    };
  window.addEventListener("keydown", o);
  let r = performance.now();
  const i = (l) => {
    const c = Math.max(0, Math.min(0.1, (l - r) / 1e3));
    if (((r = l), n.frame(c))) {
      requestAnimationFrame(i);
      return;
    }
    (window.removeEventListener("keydown", o), s.remove());
  };
  requestAnimationFrame(i);
}
const Vt = [1, 2, 4],
  Sr = 1 / 60;
function wr(a) {
  const e = Vt.indexOf(a);
  return e < 0 ? 1 : Vt[(e + 1) % Vt.length];
}
function ki(a, e) {
  return e === "simmed" ? "".concat(a, " · Simulated") : e === "watched" ? "".concat(a, " · Watched") : a;
}
function Pr(a, e) {
  for (let t = 0; t < e && a.phase !== "final"; t++) (a.update(Sr), (a.events.length = 0), (a.sfx.length = 0));
  return a.phase === "final";
}
function Si(a) {
  a.teams[0].human = !0;
}
const We = 1.6,
  St = 3,
  Da = 0.22,
  Na = 0.45,
  Qs = We + 2 * St + Na;
function xr(a) {
  return a === null ? [1, 0] : [1 - a, a];
}
let Yt = "";
function Mr() {
  const a = ["lineups_1", "lineups_2"].filter((e) => e !== Yt);
  return ((Yt = a[Math.floor(Math.random() * a.length)]), Yt);
}
function Xs(a, e, t) {
  const s = a.teams[e],
    o = a.players
      .filter((r) => r.team === e)
      .sort((r, i) => r.slot - i.slot)
      .map((r, i) =>
        '\n    <li class="s5-card" style="--d:'
          .concat((0.35 + i * Da).toFixed(2), 's">\n      <b>')
          .concat(r.mon.pos, '</b>\n      <img alt="" src="')
          .concat(le(r.mon.dex), '">\n      <span>')
          .concat(escapeHtml(r.mon.name), "</span>\n      <i>")
          .concat(r.mon.ovr, "</i>\n    </li>"),
      )
      .join("");
  return '\n    <section class="s5-team'
    .concat(t ? " mine" : "", '" data-t="')
    .concat(e, '" style="--tc:')
    .concat(s.color, ";--tc2:")
    .concat(s.color2, '">\n      <header class="s5-head"><small>')
    .concat(t ? "Your starting five" : "Starting five", "</small><strong>")
    .concat(escapeHtml(s.name), "</strong><em>OVR ")
    .concat(Rt(s.roster), '</em></header>\n      <ol class="s5-row">')
    .concat(o, "</ol>\n    </section>");
}
function Tr(a, e, t) {
  var b;
  const [s, n] = xr(t.mine),
    [o, r] = e.teams,
    i = document.createElement("div");
  ((i.className = "s5"),
    (i.innerHTML =
      '\n    <div class="s5-bar top"></div><div class="s5-bar bottom"></div>\n    <div class="s5-title"><small>'
        .concat(escapeHtml(r.name), " <i>vs</i> ")
        .concat(escapeHtml(o.name), "</small><strong>Starting lineups</strong></div>\n    ")
        .concat(Xs(e, s, s === t.mine), "\n    ")
        .concat(Xs(e, n, n === t.mine), "\n    ")
        .concat(t.skippable ? '<button class="s5-skip" type="button">Skip ▸</button>' : "")),
    a.appendChild(i),
    (b = i.querySelector(".s5-skip")) == null || b.addEventListener("click", () => v()));
  const [l, c] = [...i.querySelectorAll(".s5-team")];
  let h = 0,
    d = -1,
    f = !1;
  const u = [0, 0];
  requestAnimationFrame(() => i.classList.add("in"));
  const m = Mr();
  let p = !1;
  const y = (k, w) => {
    (i.classList.remove("title"), k.classList.add("show"), w && (t.voice.say("yourfive"), t.audio.play("swish")));
  };
  function v() {
    !t.skippable || f || (h = Math.max(h, Qs - Na));
  }
  return {
    skip: v,
    frame(k) {
      if (f) return !1;
      ((h += k), !p && h < 0.8 && t.voice.length(m) > 0 && ((p = !0), t.voice.say(m)));
      const w = h < We ? 0 : h < We + St ? 1 : h < We + 2 * St ? 2 : h < Qs ? 3 : 4;
      for (; d < w;)
        (d++,
          d === 0 && i.classList.add("title"),
          d === 1 && y(l, s === t.mine),
          d === 2 && (l.classList.replace("show", "gone"), y(c, n === t.mine)),
          d === 3 && i.classList.add("out"));
      if (d === 1 || d === 2) {
        const P = d - 1,
          S = h - (d === 1 ? We : We + St);
        for (; u[P] < 5 && S >= 0.35 + u[P] * Da + 0.15;) (u[P]++, t.audio.play("catch"));
      }
      return d >= 4 ? ((f = !0), i.remove(), !1) : !0;
    },
  };
}
const Jt = 1 / 60,
  $r = Math.max(1, Math.min(8, Number(new URLSearchParams(location.search).get("speed")) || 1));
function wi(a, e, t, s, n, o = {}) {
  var _e, Ne, Ke, Ve, F;
  a.innerHTML =
    '\n    <div class="game">\n      <div class="stage"><canvas class="court" aria-label="Basketball court"></canvas></div>\n      <button class="icon-btn pause-btn" aria-label="Pause">II</button>\n      <div class="pause-menu" hidden>\n        <div class="panel">\n          <h2>PAUSED</h2>\n          <div class="pause-actions">\n            <button class="btn primary" data-a="resume">Resume</button>\n            <button class="btn" data-a="mute"></button>\n            <button class="btn" data-a="announcer"></button>\n            <button class="btn ghost" data-a="quit">Quit to menu</button>\n          </div>\n          <div class="subs-panel" hidden></div>\n          '
      .concat(
        o.spectator ? "" : Aa(),
        '\n        </div>\n      </div>\n      <div class="loading">Warming up…</div>\n      <div class="net-status" hidden></div>\n      <div class="net-ping" hidden></div>\n      ',
      )
      .concat(
        o.spectator
          ? '<div class="spec-bar"><button class="spec-btn" data-a="speed" aria-label="Playback speed">1x</button><button class="spec-btn" data-a="skip" aria-label="Skip to result">Skip<span class="spec-long"> to result</span></button></div>'
          : "",
        "\n    </div>",
      );
  const r = a.querySelector(".game"),
    i = a.querySelector("canvas"),
    l = a.querySelector(".pause-menu"),
    c = l.querySelector('[data-a="mute"]'),
    h = l.querySelector('[data-a="announcer"]'),
    d = a.querySelector(".loading"),
    f = new MatchEngine(e),
    u = o.online,
    m = a.querySelector(".net-status"),
    p = a.querySelector(".net-ping");
  let y = "";
  u && ((f.viewTeam = u.viewTeam), u.start(f));
  const v = new gs(i),
    b = new Ga(r, f),
    k = !!o.spectator && !u;
  r.classList.toggle("spectator", k);
  const w = u || k || o.record === !1 ? null : new or(e, f.seed);
  let P = null,
    S = null;
  const $ = new lr();
  (window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0) &&
    !k &&
    ($.attachTouch(r), r.classList.add("has-touch"));
  const R = new Ca(),
    A = Gn(t);
  A.load(ls);
  let K = !0,
    Y = !1,
    J = 0,
    g = performance.now(),
    E = 0,
    C = -1,
    G = $r,
    I = !1,
    M = { shoot: !1, pass: !1, swap: !1, steal: !1, special: !1 };
  const O = () => {
    ((c.textContent = t.muted ? "Sound: off" : "Sound: on"),
      (h.textContent = A.on ? "Announcer: on" : "Announcer: off"));
  };
  O();
  const _ = l.querySelector(".subs-panel"),
    te = !!e.stamina && e.home.human && ((Ne = (_e = e.home.bench) == null ? void 0 : _e.length) != null ? Ne : 0) > 0;
  let j = null;
  const be = () => {
    if (!te) return;
    _.hidden = !1;
    const x = (L) => f.pendingSubs.find((q) => q.out === L || q.in === L),
      T = (L) => {
        const q = x(L),
          se = L.hurt
            ? "<em>hurt · out ".concat(L.hurt, " wk, comes out ENGINE_VERSION the next dead ball</em>")
            : q
              ? "<em>".concat(q.out === L ? "out" : "in", " ENGINE_VERSION next dead ball</em>")
              : "";
        return '<li><button class="sub-row '
          .concat(j === L ? "sel" : "", " ")
          .concat(q ? "pend" : "", '" data-pid="')
          .concat(L.id, '">\n        <img src="')
          .concat(le(L.mon.dex), '" alt="">\n        <span class="nm">')
          .concat(escapeHtml(L.mon.name), "<small>")
          .concat(L.mon.pos, " · ")
          .concat(L.mon.ovr, " · STA ")
          .concat(L.stamina, "</small>")
          .concat(se, '</span>\n        <i class="en ')
          .concat(L.energy < 0.5 ? "low" : "", '" style="--v:')
          .concat(Math.round(L.energy * 100), '%" title="Energy ')
          .concat(Math.round(L.energy * 100), '%"></i>\n      </button></li>');
      },
      V = f.cfg.userAutoSubs !== !1;
    _.innerHTML =
      '\n      <div class="subs-head">\n        <h3>Substitutions</h3>\n        <button class="btn small" data-a="autosubs">'
        .concat(V ? "Auto subs: on" : "Auto subs: off", '</button>\n      </div>\n      <p class="note">')
        .concat(
          j
            ? "Now pick who "
                .concat(f.players.includes(j) ? "comes in for" : "goes out for", " ")
                .concat(escapeHtml(j.mon.name), ".")
            : "Tap a player on the floor, then a bench player. Subs check in ENGINE_VERSION the next dead ball.",
        )
        .concat(
          V ? " The coach also rotates for you; turn auto subs off to run it yourself." : "",
          '</p>\n      <div class="subs-cols">\n        <div><h4>On the floor</h4><ul>',
        )
        .concat(
          f
            .teamPlayers(0)
            .sort((L, q) => L.slot - q.slot)
            .map(T)
            .join(""),
          "</ul></div>\n        <div><h4>Bench</h4><ul>",
        )
        .concat(
          f.bench
            .filter((L) => L.team === 0)
            .sort((L, q) => L.rotation - q.rotation)
            .map(T)
            .join(""),
          "</ul></div>\n      </div>",
        );
  };
  _.addEventListener("click", (x) => {
    var q, se;
    const T = x.target;
    if (T.closest('[data-a="autosubs"]')) {
      ((f.cfg.userAutoSubs = f.cfg.userAutoSubs === !1),
        w == null || w.autoSubs(f.cfg.userAutoSubs),
        (q = o.onAutoSubs) == null || q.call(o, f.cfg.userAutoSubs),
        be());
      return;
    }
    const V = Number((se = T.closest("[data-pid]")) == null ? void 0 : se.dataset.pid),
      L = [...f.players, ...f.bench].find((ne) => ne.id === V);
    if (L) {
      if (f.pendingSubs.some((ne) => ne.out === L || ne.in === L)) (f.cancelSub(L), (j = null));
      else if (!j || j === L) j = j === L ? null : L;
      else {
        const ne = f.players.includes(L);
        if (ne === f.players.includes(j)) j = L;
        else {
          const [ae, oe] = ne ? [L, j] : [j, L];
          (f.requestSub(ae, oe) && (w == null || w.sub(ae, oe)), (j = null));
        }
      }
      be();
    }
  });
  const pe = a.querySelector('[data-a="speed"]');
  (pe == null ||
    pe.addEventListener("click", () => {
      ((G = wr(G)), (pe.textContent = "".concat(G, "x")));
    }),
    (Ke = a.querySelector('.spec-bar [data-a="skip"]')) == null ||
      Ke.addEventListener("click", () => {
        f.phase !== "final" && ((I = !0), ge(!1), (d.textContent = "Finishing the game…"), r.appendChild(d));
      }));
  const Ee = () => !l.hidden,
    ge = (x) => {
      ((f.paused = x && !u), (l.hidden = !x), ($.enabled = !x), x && ((j = null), be()));
    };
  (a.querySelector(".pause-btn").addEventListener("click", () => ge(!Ee())),
    l.addEventListener("click", (x) => {
      var V;
      const T = (V = x.target.closest("[data-a]")) == null ? void 0 : V.dataset.a;
      (T === "resume" && ge(!1),
        T === "mute" && (t.setMuted(!t.muted), t.muted && A.stop(), O()),
        T === "announcer" && (A.setOn(!A.on), O()),
        T === "quit" && (ve(), n()));
    }));
  const De = (x) => {
    Ee() && (x.code === "Escape" || x.code === "KeyP") && ge(!1);
  };
  window.addEventListener("keydown", De);
  const lt = () => {
    document.hidden && f.phase !== "final" && !u && ge(!0);
  };
  (document.addEventListener("visibilitychange", lt),
    Ea([
      ...e.home.roster,
      ...e.away.roster,
      ...((Ve = e.home.bench) != null ? Ve : []),
      ...((F = e.away.bench) != null ? F : []),
    ]).then(() => {
      if (((Y = !0), d.remove(), t.startCrowd(), !K || !o.startingFive)) return;
      const x = u ? u.viewTeam : e.home.human !== e.away.human ? (e.home.human ? 0 : 1) : null;
      ((S = Tr(r, f, { audio: t, voice: A, mine: x, skippable: !u })), (b.el.hidden = !0));
    }));
  const we = (x) => {
    var V, L, q, se, ne;
    if (!K) return;
    const T = Math.max(0, Math.min(0.1, (x - g) / 1e3));
    if (((g = x), P)) {
      const { intent: ae, pause: oe } = $.read();
      if (((oe || ae.shoot || ae.pass) && P.skip(), !P.frame(T))) {
        (ve(), s(f));
        return;
      }
      J = requestAnimationFrame(we);
      return;
    }
    if (S) {
      const { intent: ae, pause: oe } = $.read();
      ((oe || ae.shoot || ae.pass) && S.skip(),
        (V = u == null ? void 0 : u.idle) == null || V.call(u),
        !(Ee() && !u) && !S.frame(T) && ((S = null), (b.el.hidden = !1)),
        v.draw(f, T),
        (J = requestAnimationFrame(we)));
      return;
    }
    if ((Y || (L = u == null ? void 0 : u.idle) == null || L.call(u), Y)) {
      const ae = $.read(),
        oe = ae.pause,
        Q = k ? makeEmptyInput() : ae.intent;
      if (
        (oe && f.phase !== "final" && !I && ge(!Ee()),
        M.shoot || (M.shoot = Q.shoot),
        M.pass || (M.pass = Q.pass),
        M.swap || (M.swap = Q.swap),
        M.steal || (M.steal = Q.steal),
        M.special || (M.special = Q.special),
        u)
      ) {
        u.advance({ ...Q, ...M }, T) > 0 && (M = { shoot: !1, pass: !1, swap: !1, steal: !1, special: !1 });
        const Z = u.status();
        ((m.hidden = !Z), Z && (m.textContent = Z));
        const ke = (se = (q = u.ping) == null ? void 0 : q.call(u)) != null ? se : null,
          ht = ke === null ? "" : "".concat(Math.round(ke), " ms");
        ht !== y && ((y = ht), (p.hidden = !ht), (p.textContent = ht), (p.dataset.q = ke === null ? "" : Er(ke)));
      } else if (I) {
        const Z = performance.now();
        for (; f.phase !== "final" && performance.now() - Z < 12;) Pr(f, 120);
        if (f.phase === "final") {
          (ve(), s(f));
          return;
        }
      } else
        for (E += T * G; E >= Jt;) {
          const Z = { ...Q, ...M };
          f.userInput = w ? w.before(f, Z) : Z;
          const ke = f.events.length;
          (f.update(Jt),
            w == null || w.after(f, f.events.slice(ke)),
            (M = { shoot: !1, pass: !1, swap: !1, steal: !1, special: !1 }),
            (E -= Jt));
        }
      const fe = f.events.splice(0);
      (b.handle(fe), v.handle(fe, f));
      const Fe = f.sfx.splice(0);
      for (const Z of Fe) t.play(Z);
      const Ss = ys.hornDelay(Fe),
        ws = R.next(fe, f.time, (Z) => Ss + A.length(Z));
      (ws && (A.load(ls), A.say(ws.clip, Ss)), (ne = o.onFrame) == null || ne.call(o, f, fe, Q, f.paused ? 0 : T));
      const ct = f.user;
      if (
        ($.setContext(!!ct && f.ball.owner === ct, !!ct && ct.special >= 1),
        f.phase === "final" && (C < 0 && (C = 3), (C -= T), C <= 0))
      ) {
        const Z = w == null ? void 0 : w.best(f),
          ke = Z && w.clip(Z);
        if (Z && ke) {
          (kr(f, { rec: w, best: Z, teamName: f.teams[Z.team].name, audio: t, voice: A }),
            (b.el.hidden = !0),
            (a.querySelector(".pause-btn").hidden = !0),
            (P = Ra(r, i, ke, Z, f.teams[Z.team].name, t, A)),
            (J = requestAnimationFrame(we)));
          return;
        }
        (ve(), s(f));
        return;
      }
    }
    (v.draw(f, f.paused ? 0 : T), b.update(f.paused ? 0 : T), (J = requestAnimationFrame(we)));
  };
  J = requestAnimationFrame(we);
  function ve() {
    var x;
    ((K = !1),
      (S = null),
      (x = r.querySelector(".s5")) == null || x.remove(),
      cancelAnimationFrame(J),
      $.destroy(),
      t.stopCrowd(),
      A.stop(),
      window.removeEventListener("keydown", De),
      document.removeEventListener("visibilitychange", lt));
  }
  return { stop: ve };
}
const Er = (a) => (a < 180 ? "good" : a <= 300 ? "fair" : "poor");
export {
  MatchEngine,
  getPokemon,
  buildPlayer,
  calcOVR,
  calcArchetype,
  sizeFactor,
  rollGrowth,
  xpToNext,
  settleMatch,
  seededRng,
  DIFFICULTY_LEVELS,
  TYPE_CHART,
  POKEMON_LIST,
  POSITION_WEIGHTS,
  STAT_LABELS,
  SPECIAL_EFFECTS,
  SPECIAL_MOVES,
  EVOLUTIONS,
  LEAGUE_GYMS,
  POSITION_ORDER,
  TYPE_COLORS,
  makeEmptyInput,
  INPUT_BITS,
  ENGINE_VERSION,
  clampNum,
  dist2d as distanceFn,
  lerpNum,
  weightsOf,
  isMythical,
  getMeasurements,
  buildPokemonEntry,
  buildTeamPlayerView,
  pickHealthyStarters,
  makeEmptyStats,
  saveKeyRoute,
  gs as Renderer,
  mi as buildMatchSettingsUI,
  pi as buildMatchRunner,
  wi as startMatchLoop,
  bi as matchInputDriver,
  Io as demoMatch,
  Oo as attractLoop,
  Ks as pickTeamRoster,
  va as versusTeam,
  Ea as preloadSprites,
  ye as franchiseView,
  Or as gameScoreOf,
  ts as playerGameScore,
  ds as COURT_STYLES,
  ms as defaultCourtStyle,
  Vs as clockTextOf,
  /* 比赛屏组件（wi/startMatchLoop 的内部依赖，系统层组装用） */
  Ga as Scoreboard,
  lr as InputManager,
  ys as AnnouncerClips,
  Gn as createAnnouncerVoice,
  Ca as AnnouncerChooser,
  Tr as pregameIntro,
  Ra as playHighlight,
  kr as showHighlightBanner,
  Pr as fastSimulate,
  Kr as simulateFullMatch,
  Aa as touchHelpHtml,
  le as spritePath,
};
