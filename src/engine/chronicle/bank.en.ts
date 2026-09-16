// M-09 · The text bank. design.md §9.1, §9.3, Annex B.2.
//
// Everything the player ever reads comes from here. The systems push keys and
// parameters; not one sentence is written anywhere else in the engine.
//
// The rules of §9.3, which the tests enforce:
//
//   Short, concrete, unadorned. Name the people, the year and the number. The
//   drama comes out of the event, not the prose — if a line has to be dressed
//   up to be interesting, the event was not interesting and the problem is in
//   how the systems crossed, not here.
//
//   No exclamation marks. No second person. No metaphors. And nothing that
//   passes judgement on what the player chose: the chronicle narrates, it does
//   not grade.
//
// Three to five variants per key, so that a village that buries four people in
// one winter does not bury them in four identical sentences.
//
// Anonymous villagers have no name and never will (§6.1). Their births, deaths
// and departures are counted, not named, which is why every one of those keys
// comes in `.one` and `.many` forms.

export const BANK: Record<string, string[]> = {
  // -------------------------------------------------------------------------
  // The founding
  // -------------------------------------------------------------------------
  // Dos desde el 15 sep 2026: una pareja funda, y los demás llegan.
  founding: [
    'Two came over the ridge and stopped where the river bends. Year one.',
    'They stopped here because the water was clean and no one owned it. Year one.',
    'Nobody wrote down why they stopped. Year one.',
    'A man and a woman, and a valley nobody had claimed. Year one.',
  ],

  // -------------------------------------------------------------------------
  // Seasons — weight 1, the quiet ticking underneath everything else
  // -------------------------------------------------------------------------
  'season.spring': [
    'Spring, year {year}.',
    'Year {year}. The ground softened and the ploughing began.',
    'The thaw came late in year {year}.',
  ],
  'season.summer': [
    'Summer, year {year}.',
    'Year {year}. The days ran long and the work with them.',
    'Summer of year {year}. The river dropped a hand.',
  ],
  'season.autumn': [
    'Autumn, year {year}.',
    'Year {year}. They began counting what there was.',
    'The turn of the year {year}, and the fields going gold.',
  ],
  'season.winter': [
    'Winter, year {year}.',
    'Year {year}. The valley closed in.',
    'Winter of year {year}. The woodpile was what mattered now.',
  ],

  // -------------------------------------------------------------------------
  // Births
  // -------------------------------------------------------------------------
  'birth.named.daughter': [
    '{name} had a daughter in the {season} of year {year}.',
    'A daughter was born to {name} that {season}.',
    "{name}'s daughter came in the {season} of year {year}.",
  ],
  'birth.named.son': [
    '{name} had a son in the {season} of year {year}.',
    'A son was born to {name} that {season}.',
    "{name}'s son came in the {season} of year {year}.",
  ],
  'birth.anon.one': [
    'A child was born that {season}.',
    'One child born, the {season} of year {year}.',
    'There was a birth that {season}. The village was {people}.',
  ],
  'birth.anon.many': [
    '{count} children were born that {season}.',
    '{count} born in the {season} of year {year}.',
    'The {season} brought {count} children. The village was {people}.',
  ],

  // -------------------------------------------------------------------------
  // Deaths — old age
  // -------------------------------------------------------------------------
  'death.old_age.named': [
    '{name} died in the {season} of year {year}, {age} winters old.',
    'Age took {name} that {season}. {age} winters.',
    '{name} did not see another {season}. {age} winters, and no debts.',
    '{name} died in year {year}. {age} winters, and had seen the valley empty.',
  ],
  'death.old_age.anon.one': [
    'One of the old died that {season}.',
    'An old one went in the {season} of year {year}.',
    'They buried one of the elders that {season}.',
  ],
  'death.old_age.anon.many': [
    '{count} of the old died that {season}.',
    '{count} elders went in the {season} of year {year}.',
    'The {season} took {count} of the old ones.',
  ],

  // -------------------------------------------------------------------------
  // Deaths — natural, the ones with no cause anyone can name (§5.6)
  // -------------------------------------------------------------------------
  'death.natural.named': [
    '{name} died in the {season} of year {year}. {age} winters, and nothing to point at.',
    '{name} was well on the Sunday and gone by the Friday. {age} winters.',
    'Nobody could say what took {name} that {season}. {age} winters.',
    '{name} died in year {year}, {age} winters old. No one knew of what.',
  ],
  'death.natural.anon.one': [
    'One died that {season}, and nobody could say of what.',
    'A death in the {season} of year {year}, with no cause anyone could name.',
    'Someone went that {season}. There had been no sickness in the valley.',
  ],
  'death.natural.anon.many': [
    '{count} died that {season}, and nobody could say of what.',
    '{count} deaths in the {season} of year {year}, none of them explained.',
    'The {season} took {count}, and there had been no sickness.',
  ],

  // -------------------------------------------------------------------------
  // Deaths — hunger
  // -------------------------------------------------------------------------
  'death.hunger.named': [
    '{name} went in the {season}. There had been no bread for eleven days.',
    'Hunger took {name}, {age} winters old.',
    '{name} gave their share to the children twice, and then did not need it.',
    '{name} died in the {season} of year {year}. The granary had been empty since the thaw.',
  ],
  'death.hunger.anon.one': [
    'One starved that {season}.',
    'Hunger took one in the {season} of year {year}.',
    'There was one death from hunger that {season}. The village was {people}.',
  ],
  'death.hunger.anon.many': [
    '{count} starved that {season}.',
    'Hunger took {count} in the {season} of year {year}.',
    '{count} died of hunger that {season}. The village was {people}.',
  ],

  // -------------------------------------------------------------------------
  // Deaths — the sickness
  // -------------------------------------------------------------------------
  'death.plague.named': [
    'The sickness took {name} on the fourth day.',
    '{name} was well on the Sunday and buried on the Thursday.',
    '{name}, {age} winters. The pit took eleven that week.',
    'The sickness reached {name} in the {season} of year {year}.',
  ],
  'death.plague.anon.one': [
    'The sickness took one that {season}.',
    'One died of it in the {season} of year {year}.',
    'There was one more for the pit that {season}.',
  ],
  'death.plague.anon.many': [
    'The sickness took {count} that {season}.',
    '{count} died of it in the {season} of year {year}.',
    'The pit took {count} that {season}. The village was {people}.',
  ],

  // -------------------------------------------------------------------------
  // Deaths — the cold
  // -------------------------------------------------------------------------
  'death.cold.named': [
    '{name} died in the cold of year {year}. The woodpile had been empty since midwinter.',
    'The cold took {name}, {age} winters old.',
    '{name} did not wake on the coldest night of year {year}.',
  ],
  'death.cold.anon.one': [
    'One died of the cold that winter.',
    'The cold took one in year {year}. There was no wood left.',
    'One did not wake, the winter of year {year}.',
  ],
  'death.cold.anon.many': [
    '{count} died of the cold that winter.',
    'The cold took {count} in year {year}. There was no wood left.',
    '{count} did not wake, the winter of year {year}.',
  ],

  // -------------------------------------------------------------------------
  // Deaths — fire and violence
  // -------------------------------------------------------------------------
  'death.fire.named': [
    '{name} died in the fire, {age} winters old.',
    'The fire took {name} in the {season} of year {year}.',
    '{name} went back in for something and did not come out.',
  ],
  'death.fire.anon.one': [
    'One died in the fire that {season}.',
    'The fire took one in the {season} of year {year}.',
    'There was one they did not get out.',
  ],
  'death.fire.anon.many': [
    '{count} died in the fire that {season}.',
    'The fire took {count} in the {season} of year {year}.',
    'There were {count} they did not get out.',
  ],
  'death.violence.named': [
    '{name} was killed in the {season} of year {year}. {age} winters.',
    'They buried {name} that {season}, and did not say much over the grave.',
    '{name} died by another hand in year {year}.',
  ],
  'death.violence.anon.one': [
    'One was killed that {season}.',
    'There was a killing in the {season} of year {year}.',
    'One died by another hand that {season}.',
  ],
  'death.violence.anon.many': [
    '{count} were killed that {season}.',
    'There were {count} killings in the {season} of year {year}.',
    '{count} died by other hands that {season}.',
  ],

  // -------------------------------------------------------------------------
  // -------------------------------------------------------------------------
  // §9.2, v2.14 · The yearly forms.
  //
  // When a family of entries lands more than once in the same year the
  // chronicle writes one line with the count instead of all of them. These
  // lines are the ones it writes, and they carry only {count} and {year}: a
  // season or a headcount taken from the first of a dozen entries would be a
  // number that was true in March and printed as though it were true all year.
  //
  // Nothing that names a person aggregates, so there is no yearly form for a
  // named death or a named birth. §9.4 gives each of those its own line.
  // -------------------------------------------------------------------------

  'birth.anon.year': [
    '{count} children were born in year {year}.',
    'There were {count} births that year.',
    '{count} were born into the valley in year {year}.',
  ],

  'death.natural.anon.year': [
    '{count} were buried in year {year}.',
    'The year took {count}, and none of them were old.',
    '{count} died in year {year} for no reason anyone could name.',
  ],
  'death.old_age.anon.year': [
    '{count} were buried in year {year}, and none of them young.',
    'The old went that year: {count} of them.',
    'Year {year} buried {count} who had seen enough winters.',
  ],
  'death.hunger.anon.year': [
    '{count} starved in year {year}.',
    'Hunger took {count} that year.',
    'Year {year} was the year {count} did not eat.',
  ],
  'death.cold.anon.year': [
    'The cold took {count} in year {year}.',
    '{count} froze that year.',
    'Year {year} had an empty woodpile and {count} did not see the thaw.',
  ],
  'death.plague.anon.year': [
    'The sickness took {count} in year {year}.',
    '{count} died of it that year.',
    'Year {year} buried {count} to the fever.',
  ],
  'death.fire.anon.year': [
    'Fire took {count} in year {year}.',
    '{count} died in the burning that year.',
    'Year {year} lost {count} to fire.',
  ],
  'death.violence.anon.year': [
    '{count} were killed in year {year}.',
    'Year {year} was the year {count} died by hand.',
    '{count} did not die of anything the valley could call natural, in year {year}.',
  ],

  'arrival.year': [
    '{count} came up the ford road in year {year} and stayed.',
    'Year {year} brought {count} over the ridge.',
    '{count} arrived that year.',
  ],
  'departure.year': [
    '{count} left by the ford road in year {year}.',
    'Year {year} was the year {count} walked out.',
    '{count} went that year and did not come back.',
  ],

  'built.house.year': [
    '{count} houses went up in year {year}.',
    'They raised {count} houses that year.',
    'Year {year} put roofs over {count} more households.',
  ],
  'built.field.year': [
    'They broke {count} new fields in year {year}.',
    '{count} more fields were ploughed that year.',
    'Year {year} took {count} fields out of the meadow.',
  ],
  'built.granary.year': [
    'They finished {count} granaries in year {year}.',
    '{count} more granaries stood by the end of year {year}.',
    'Year {year} gave the valley {count} places to keep its grain.',
  ],
  // R-1 · Con los veinte de §12.2 la aldea levanta más de una fragua y más de
  // un molino en el mismo año, y §9.2 exige forma anual para toda familia que
  // se repita dentro de un año. Antes no hacían falta porque la aldea nunca
  // llegaba a dos de ninguna de las dos cosas en doce meses.
  'built.smithy.year': [
    '{count} forges were lit in year {year}.',
    'They raised {count} smithies that year.',
    'Year {year} gave the valley {count} more anvils.',
  ],
  'built.mill.year': [
    '{count} mills began turning in year {year}.',
    'They finished {count} mills that year.',
    'Year {year} set {count} more millstones to work.',
  ],
  'built.palisade.year': [
    'The palisade closed around the village in year {year}.',
    '{count} lengths of palisade went up that year.',
    'Year {year} was the year they fenced themselves in.',
  ],
  'built.wall.year': [
    'The wall went up in stone in year {year}, {count} lengths of it.',
    '{count} lengths of palisade became wall that year.',
    'Year {year} put stone where the stakes had been.',
  ],
  'built.stone_house.year': [
    '{count} houses were rebuilt in stone in year {year}.',
    'Year {year} put {count} families under stone.',
    '{count} of the houses stopped being able to burn, in year {year}.',
  ],
  'built.watchtower.year': [
    'They raised {count} towers in year {year}.',
    '{count} watchtowers stood by the end of year {year}.',
    'Year {year} gave the valley {count} places to watch the road from.',
  ],

  'lost.house.year': [
    '{count} houses were lost in year {year}.',
    'Year {year} took {count} houses.',
    '{count} roofs came down that year.',
  ],
  'lost.granary.year': [
    '{count} granaries were lost in year {year}.',
    'Year {year} took {count} granaries and what was in them.',
    '{count} of the granaries went that year.',
  ],
  'lost.field.year': [
    '{count} fields went back to grass in year {year}.',
    'Year {year} lost {count} fields.',
    '{count} of the fields were not sown again after year {year}.',
  ],
  'lost.other.year': [
    '{count} buildings were lost in year {year}.',
    'Year {year} took {count} of the valley’s buildings.',
    '{count} things that had stood did not stand after year {year}.',
  ],

  // -------------------------------------------------------------------------
  // §5.7, v2.16 · The settlement that was given up. Weight 3: it is the end of
  // the game, and it is not the same end as an extinction — nobody died of it.
  // -------------------------------------------------------------------------

  'abandonment': [
    'The last {count} walked out in the {season} of year {year}, and the valley was nobody\u2019s again.',
    'In year {year} the remaining {count} took what they could carry and went.',
    'There were {count} left in year {year}, and then there were none. They did not die; they left.',
  ],

  // Annex A.15, v2.22 \u00b7 Refused a leader three times running, with nobody
  // appointed in between, and gave up on the valley. Weight 3.
  'dispersal': [
    'Nobody would speak for the valley a third time, in the {season} of year {year}, and the last {count} scattered.',
    'Asked three times, and three times they said no one. In year {year} the {count} who were left went their own ways.',
    'By the {season} of year {year} they had refused a leader three times, and nothing held {count} of them together.',
  ],

  // -------------------------------------------------------------------------
  // §9, v2.16 · The one thing about the forest that is an event and not a
  // state: the week the last of the old wood comes down. Weight 2.
  // -------------------------------------------------------------------------

  'forest.old_gone': [
    'The last of the old wood came down in the {season} of year {year}.',
    'In year {year} they felled the last tree that had been standing when they came.',
    'By the {season} of year {year} nothing was left of the wood they had found here.',
  ],

  // §9.4 · What a named death drags behind it
  //
  // These are not lines of their own. They are the second sentence appended to
  // a named villager's death, carrying the oldest grudge they never made up or,
  // failing that, the heaviest thing they remembered.
  //
  // Without it the quarrel of year 5, the reconciliation of year 12 and the
  // death in year 14 are three loose lines that no reader joins up, and the
  // character dies without ever having existed. The material is not in the
  // events; it is in the links between events years apart.
  // -------------------------------------------------------------------------
  'death.named.grudge': [
    'The quarrel with {other} had run since year {sinceYear}, and was never made up.',
    '{name} and {other} had not spoken since year {sinceYear}.',
    'Whatever stood between {name} and {other} since year {sinceYear} went into the ground too.',
  ],
  'death.named.grudge_healed': [
    'They had not spoken to {other} for {count} years, and then they had.',
    '{name} and {other} were at odds for {count} years before they made it up.',
    'The quarrel with {other} lasted {count} years, and ended before either did.',
  ],
  'death.named.lost_child': [
    '{name} had buried a child in year {sinceYear}.',
    'There had been a child, buried in year {sinceYear}.',
    '{name} lost a child in year {sinceYear} and did not speak of it after.',
  ],
  'death.named.was_blamed': [
    '{name} had been blamed in front of the village in year {sinceYear}.',
    'The accusation of year {sinceYear} was never taken back.',
    'Since year {sinceYear} there were those who still held it against {name}.',
  ],
  'death.named.was_saved': [
    '{other} had pulled {name} out of it in year {sinceYear}.',
    '{name} had owed {other} since year {sinceYear}.',
    'There was a debt to {other} from year {sinceYear}, and it was never called in.',
  ],
  'death.named.was_passed_over': [
    '{name} had been passed over in year {sinceYear}, and never asked again.',
    'They had chosen someone else in year {sinceYear}.',
    '{name} was not the one they turned to in year {sinceYear}.',
  ],
  'death.named.went_hungry': [
    '{name} had gone without in the hunger of year {sinceYear}.',
    'There had been a winter, year {sinceYear}, that {name} did not talk about.',
    '{name} gave away a share in year {sinceYear} and never got it back.',
  ],
  'death.named.lost_home': [
    '{name} had lost a house in year {sinceYear}.',
    'The house {name} lost in year {sinceYear} was never rebuilt.',
    'There had been a fire in year {sinceYear}, and {name} started again after it.',
  ],
  'death.named.unspoken': [
    'Nobody could say what had gone wrong, only that it had, in year {sinceYear}.',
    'There was something from year {sinceYear} that nobody wrote down.',
    'Whatever happened in year {sinceYear} was never said out loud.',
  ],

  // -------------------------------------------------------------------------
  // The harvest
  // -------------------------------------------------------------------------
  'harvest.ruinous': [
    'The harvest failed. {grain} bushels for {people} mouths.',
    'They got {grain} bushels out of the ground in year {year}, and counted them twice.',
    'A ruined autumn. {grain} bushels, and the village is {people}.',
  ],
  'harvest.poor': [
    'The harvest came in thin. {grain} bushels for {people} mouths.',
    'A poor autumn. The granary took {grain} bushels; the village is {people}.',
    '{grain} bushels in year {year}. It would not see them to the thaw.',
  ],
  'harvest.fair': [
    'The harvest came in at {grain} bushels. The village is {people}.',
    'An ordinary autumn. {grain} bushels in year {year}.',
    'They took {grain} bushels off the fields and thought no more about it.',
  ],
  'harvest.good': [
    'A good autumn. {grain} bushels for {people} mouths.',
    '{grain} bushels in year {year}, and room to spare in the granary.',
    'The harvest came in heavy. {grain} bushels.',
  ],
  'harvest.abundant': [
    'The best harvest anyone could remember. {grain} bushels.',
    '{grain} bushels, and the granary would not hold it all.',
    'Year {year} gave {grain} bushels to {people} mouths.',
  ],

  // -------------------------------------------------------------------------
  // Famine and sickness as conditions
  // -------------------------------------------------------------------------
  'famine.begins': [
    'The grain ran out in the {season} of year {year}.',
    'By the {season} of year {year} there was nothing left in the granary.',
    'The granary was empty that {season}, and the winter still ahead.',
  ],
  'famine.ends': [
    'There was bread again by the {season} of year {year}.',
    'The hunger broke that {season}. {people} were left.',
    'They ate properly again in the {season} of year {year}.',
  ],
  'plague.begins': [
    'The sickness came in the {season} of year {year}.',
    'It started in one house and did not stay there. That was the {season} of year {year}.',
    'The sickness reached the valley that {season}.',
  ],
  'plague.ends': [
    'The sickness burned itself out by the {season} of year {year}. {people} were left.',
    'It ended that {season}. They had buried {count}.',
    'By the {season} of year {year} nobody new was falling ill.',
  ],

  // -------------------------------------------------------------------------
  // Fire
  // -------------------------------------------------------------------------
  'fire.house': [
    'A house burned in the {season} of year {year}.',
    'Fire took a house that {season}. They put it out before it reached the next.',
    'One of the houses burned down in year {year}.',
  ],
  'fire.granary': [
    'The granary burned in the {season} of year {year}. {grain} bushels went with it.',
    'Fire took the granary that {season}, and {grain} bushels with it.',
    'They lost the granary and {grain} bushels in year {year}.',
  ],
  'fire.other': [
    'Fire took the {building} in the {season} of year {year}.',
    'The {building} burned that {season}.',
    'They lost the {building} to fire in year {year}.',
  ],

  // R-1 · Los sucesos del valle (§7.10). Pasan sin que nadie decida nada, y por
  // eso se cuentan como se cuenta el tiempo: lo que pasó y a quién, sin juicio.
  'fate.lightning_fire': [
    'Lightning struck the {building} in the {season} of year {year}. It burned to the ground.',
    'A storm in {season} brought the lightning down on the {building}. Nothing of it was saved.',
    'The {building} burned in the storm of {season}, year {year}, struck from the sky.',
  ],
  'fate.river_flood': [
    'The river came over its banks in the {season} of year {year}, and {grain} bushels were spoiled.',
    'After a week of rain the ford went under and the low fields with it: {grain} bushels lost.',
    'The spring flood of year {year} took {grain} bushels from the granary floor.',
  ],
  'fate.wolves_at_the_coop': [
    'Wolves came to the coop one night in {season}, and {count} hens were gone by morning.',
    'The wolves took {count} hens in the {season} of year {year}.',
    'Tracks in the snow at the coop, and {count} hens fewer.',
  ],
  'fate.wedding': [
    'There was a wedding in the {season} of year {year}. The whole valley came.',
    'Two were married that {season}, and the village ate and danced till dark.',
    'A wedding in year {year}, in the {season}: the first music heard in weeks.',
  ],
  'fate.pedlar': [
    'A pedlar came through in {season} and took {wood} wood for {grain} bushels of grain.',
    'The pedlar of year {year} traded {grain} bushels for {wood} wood and went on his way.',
    'A cart came over the ridge that {season}: {wood} wood went out, {grain} bushels came in.',
  ],
  'fate.good_catch': [
    'The river ran thick with fish that {season}: {grain} bushels worth, salted and stored.',
    'A good catch in the {season} of year {year}: {grain} bushels the fields did not have to give.',
    'They came back from the ford with baskets full, {grain} bushels once counted.',
  ],
  'fate.roof_under_snow': [
    'A roof gave way under the snow in the {season} of year {year}, and {wood} wood went into mending it.',
    'The snow brought a roof down. The family slept elsewhere while {wood} wood put it right.',
    'Snow on the thatch, and one house open to the sky for a week: {wood} wood to mend it.',
  ],
  'fate.harvest_feast': [
    'The harvest was in, and the valley kept the feast that {season}.',
    'A feast after the harvest of year {year}: bread, ale, and every table carried outside.',
    'They feasted the harvest in the {season} of year {year}, as the valley does when the grain is in.',
  ],
  'fate.quarrel_in_the_square': [
    '{A} and {B} came to words in the square that {season}. The village heard every one.',
    'A quarrel between {A} and {B} in year {year}, loud enough to stop the work.',
    '{A} shouted at {B} in the square, and {B} shouted back. Nobody has forgotten it.',
  ],
  'fate.bear_in_the_wood': [
    'A bear was seen in the wood in the {season} of year {year}. Nobody went far from the houses for a while.',
    'Bear tracks at the wood edge that {season}. The gathering stopped until it moved on.',
    'A bear in the wood in year {year}: two weeks with the axes at home.',
  ],
  'fate.child_lost': [
    'A child wandered off in the {season} of year {year}. The valley searched the riverbank till it was found.',
    'One of the children went missing for an afternoon that {season}. Found by the ford, cold and whole.',
    'A child lost and found in year {year}, and the whole village out along the river looking.',
  ],
  'fate.child_lost.named': [
    '{A} wandered off in the {season} of year {year}. The valley searched the riverbank till {A} was found.',
    '{A} went missing for an afternoon that {season}. Found by the ford, cold and whole.',
    '{A} was lost and found in year {year}, and the whole village out along the river looking.',
  ],
  'fate.stranger_passes': [
    'A stranger came through the valley in {season} and stayed one night.',
    'Someone passed along the road in the {season} of year {year}, stopped at the square, and went on.',
    'A traveller in year {year}, gone by morning. They talked of it for a week.',
  ],

  // -------------------------------------------------------------------------
  // Buildings raised
  // -------------------------------------------------------------------------
  'built.house': [
    'They raised a house in the {season} of year {year}.',
    'A new house went up that {season}. That made {count}.',
    'There was a house standing by the end of year {year} that had not been there in spring.',
  ],
  'built.field': [
    'They broke new ground in the {season} of year {year}.',
    'A new field was cleared that {season}. That made {count}.',
    'They ploughed another field in year {year}.',
  ],
  'built.granary': [
    'The granary was finished in the {season} of year {year}.',
    'They raised a granary that {season}, and filled it the same autumn.',
    'A granary went up in year {year}.',
  ],
  'built.well': [
    'They dug the well in the {season} of year {year}.',
    'The well was finished that {season}. Nobody carried from the river after that.',
    'A well was sunk in year {year}.',
  ],
  'built.chapel': [
    'The chapel was finished in the {season} of year {year}.',
    'They raised a chapel that {season}.',
    'There was a chapel in the valley by the end of year {year}.',
  ],
  'built.smithy': [
    'The forge was lit for the first time in the {season} of year {year}.',
    'They finished the smithy that {season}.',
    'A smithy went up in year {year}, and the work went faster after.',
  ],
  'built.mill': [
    'The mill turned for the first time in the {season} of year {year}.',
    'They finished the mill that {season}.',
    'A mill went up in year {year}.',
  ],
  'built.palisade': [
    'They put up another length of palisade in the {season} of year {year}.',
    'The palisade grew by a stretch that {season}.',
    'More of the palisade went up in year {year}.',
  ],
  'built.grave_yard': [
    'They walled off ground for the dead in the {season} of year {year}.',
    'The burying ground was marked out that {season}.',
    'There was a graveyard by the end of year {year}.',
  ],
  'built.wall': [
    'They set stone where the palisade had been, in the {season} of year {year}.',
    'A length of wall went up in stone that {season}.',
    'The stone wall grew by a stretch in year {year}.',
  ],
  'built.stone_house': [
    'They rebuilt a house in stone in the {season} of year {year}.',
    'A house was raised again in stone that {season}. It would not burn.',
    'One of the houses was stone by the end of year {year}.',
  ],
  'built.church': [
    'The church was finished in the {season} of year {year}.',
    'They raised the church in stone that {season}.',
    'There was a church where the chapel had been, by the end of year {year}.',
  ],
  'built.watchtower': [
    'The watchtower was finished in the {season} of year {year}.',
    'They raised a tower that {season}, and put someone in it.',
    'A watchtower stood over the valley by the end of year {year}.',
  ],

  // -------------------------------------------------------------------------
  // Buildings lost
  // -------------------------------------------------------------------------
  'lost.house': [
    'A house was lost in the {season} of year {year}.',
    'They left one of the houses to fall that {season}.',
    'One house fewer by the end of year {year}.',
  ],
  'lost.granary': [
    'The granary was lost in the {season} of year {year}.',
    'They lost the granary that {season}.',
    'The granary came down in year {year}.',
  ],
  'lost.field': [
    'A field went back to grass in the {season} of year {year}.',
    'They stopped working one of the fields that {season}.',
    'One field fewer by the end of year {year}.',
  ],
  'lost.other': [
    'The {building} was lost in the {season} of year {year}.',
    'They lost the {building} that {season}.',
    'The {building} came down in year {year}.',
  ],

  // -------------------------------------------------------------------------
  // Coming and going
  // -------------------------------------------------------------------------
  'arrival.one': [
    'A stranger came up the ford road in the spring of year {year}.',
    'One arrived that spring and stayed. The village was {people}.',
    'Someone came over the ridge in year {year} and did not leave.',
  ],
  'arrival.many': [
    '{count} came up the ford road in the spring of year {year}.',
    '{count} arrived that spring and stayed. The village was {people}.',
    '{count} came over the ridge in year {year}.',
  ],
  'departure.one': [
    'One left by the ford road that spring.',
    'Someone went in the spring of year {year} and did not come back.',
    'One walked out in year {year}. The village was {people}.',
  ],
  'departure.many': [
    '{count} left by the ford road that spring.',
    '{count} went in the spring of year {year} and did not come back.',
    '{count} walked out in year {year}. The village was {people}.',
  ],

  // -------------------------------------------------------------------------
  // People and their quarrels
  // -------------------------------------------------------------------------
  'grudge.formed': [
    '{name} stopped speaking to {other} in the {season} of year {year}.',
    'Something went wrong between {name} and {other} that {season}.',
    '{name} would not sit with {other} after the {season} of year {year}.',
  ],
  'grudge.healed': [
    '{name} and {other} spoke again in year {year}, after {count} winters.',
    'Whatever it was between {name} and {other} was over by year {year}.',
    '{name} sat with {other} again that {season}.',
  ],
  succession: [
    '{name} took the lead in the {season} of year {year}, after {other}.',
    '{other} was gone, and it was {name} they turned to. Year {year}.',
    'They made {name} the head of the valley in year {year}.',
  ],

  // -------------------------------------------------------------------------
  // The end
  // -------------------------------------------------------------------------
  extinction: [
    '{name} was the last. Year {year}, {age} winters old.',
    'The valley was empty by the end of year {year}. {name} was the last of them.',
    'There was nobody left in year {year}. {name} had been the last for a season.',
  ],
};

// ---------------------------------------------------------------------------
// The decision screen. design.md Annex A, §8.1.
//
// A second bank, in this file because CLAUDE.md is right that every word the
// player reads comes from here — but under different rules, because it is a
// different kind of text.
//
// A chronicle line is one of three to five ways of saying the same thing, and
// it gets said whenever that thing happens. A crossroad's title and body are
// the situation itself: they are shown once, they are written for that one
// moment, and giving them variants would mean writing the same dilemma three
// times and picking one at random. The verb and the price are the same — the
// player is choosing between them and they have to hold still.
//
// So: one entry each, transcribed from Annex A, and the §9.3 length and
// full-stop rules do not apply to a title or to a two-word verb. The rest of
// §9.3 does, and is tested: no exclamation marks, no second person, and nothing
// that grades the choice. The body sets a situation up; it never says which way
// to jump.
// ---------------------------------------------------------------------------

export const CROSSROAD_BANK: Record<string, string> = {
  // --- A.1 winter_grain_debt ---
  'crossroad.winter_grain_debt.title': 'The Lord of Wealdmere Sends Carts',
  'crossroad.winter_grain_debt.body':
    'Year {year}. The granary is bare and the frost has not broken. Riders from Wealdmere wait at the ford with three carts of rye. Their captain will not unload them until {A} kneels.',
  'crossroad.winter_grain_debt.kneel.label': 'Kneel',
  'crossroad.winter_grain_debt.kneel.cost': 'The valley is no longer its own',
  'crossroad.winter_grain_debt.refuse.label': 'Refuse',
  'crossroad.winter_grain_debt.refuse.cost': 'People will die this winter',
  'crossroad.winter_grain_debt.take_it_at_night.label': 'Take it at night',
  'crossroad.winter_grain_debt.take_it_at_night.cost': 'If it is found out, they come armed',

  // --- A.2 tithe_demand ---
  'crossroad.tithe_demand.title': 'The Ledger and the Sheaves',
  'crossroad.tithe_demand.body':
    'The lord has sent a man to count the sheaves. He has counted them twice and written down a number {A} says is wrong.',
  'crossroad.tithe_demand.pay_in_full.label': 'Pay in full',
  'crossroad.tithe_demand.pay_in_full.cost': 'A quarter of the harvest',
  'crossroad.tithe_demand.pay_short.label': 'Pay short',
  'crossroad.tithe_demand.pay_short.cost': 'They will count again next year',
  'crossroad.tithe_demand.send_him_away.label': 'Send him away',
  'crossroad.tithe_demand.send_him_away.cost': 'Wealdmere does not forget',

  // --- A.3 hungry_spring ---
  'crossroad.hungry_spring.title': 'Seed or Bread',
  'crossroad.hungry_spring.body':
    'There is grain enough to sow the fields, or grain enough to eat until midsummer. {A} has counted it, and {B} has counted the children.',
  'crossroad.hungry_spring.sow_it.label': 'Sow it',
  'crossroad.hungry_spring.sow_it.cost': 'A hungry summer',
  'crossroad.hungry_spring.eat_it.label': 'Eat it',
  'crossroad.hungry_spring.eat_it.cost': 'A thin harvest',
  'crossroad.hungry_spring.half_and_half.label': 'Half and half',
  'crossroad.hungry_spring.half_and_half.cost': 'Both, and neither enough',

  // --- A.4 granary_theft ---
  'crossroad.granary_theft.title': 'The Broken Latch',
  'crossroad.granary_theft.body':
    'Someone has been at the granary in the night. {B} says it was {A}. {A} says nothing at all.',
  'crossroad.granary_theft.believe_b.label': 'Believe {B}',
  'crossroad.granary_theft.believe_b.cost': '{A} is cast out',
  'crossroad.granary_theft.believe_a.label': 'Believe {A}',
  'crossroad.granary_theft.believe_a.cost': '{B} will not forget',
  'crossroad.granary_theft.a_new_latch.label': 'Hang a new latch and say nothing',
  'crossroad.granary_theft.a_new_latch.cost': 'Everyone stays, and everyone knows',

  // --- A.5 plague_pit ---
  'crossroad.plague_pit.title': 'Where the Dead Go',
  'crossroad.plague_pit.body':
    'Nine dead in eleven days. The churchyard is small and the ground is hard. {A} wants them blessed one by one. {B} wants a pit and lime, dug today.',
  'crossroad.plague_pit.bless_them.label': 'Bless them',
  'crossroad.plague_pit.bless_them.cost': 'The sickness has more days to work',
  'crossroad.plague_pit.the_pit.label': 'The pit',
  'crossroad.plague_pit.the_pit.cost': 'No one will forget who chose it',
  'crossroad.plague_pit.burn_the_houses.label': 'Burn the houses of the dead',
  'crossroad.plague_pit.burn_the_houses.cost': 'Roofs for ash',

  // --- A.6 plague_blame ---
  'crossroad.plague_blame.title': 'A Reason for It',
  'crossroad.plague_blame.body':
    '{A} has preached three days that the sickness is a judgement, and by the third day the village had decided whose.',
  'crossroad.plague_blame.give_them_b.label': 'Give them {B}',
  'crossroad.plague_blame.give_them_b.cost': '{B} does not come back',
  'crossroad.plague_blame.silence_a.label': 'Silence {A}',
  'crossroad.plague_blame.silence_a.cost': 'The village keeps its priest and loses its faith',
  'crossroad.plague_blame.say_nothing.label': 'Say nothing',
  'crossroad.plague_blame.say_nothing.cost': 'It will find its own end',

  // --- A.7 smith_feud ---
  'crossroad.smith_feud.title': 'The Anvil and the Altar',
  'crossroad.smith_feud.body':
    'It has been building for years. This morning {A} put a hand on {B} in front of the whole village, and now both are waiting to see what happens.',
  'crossroad.smith_feud.side_with_a.label': 'Side with {A}',
  'crossroad.smith_feud.side_with_a.cost': '{B} withdraws',
  'crossroad.smith_feud.side_with_b.label': 'Side with {B}',
  'crossroad.smith_feud.side_with_b.cost': '{A} withdraws',
  'crossroad.smith_feud.build_together.label': 'Make them build something together',
  'crossroad.smith_feud.build_together.cost': 'Neither forgives it, and the wall goes up',

  // --- A.8 feud_inherited ---
  'crossroad.feud_inherited.title': 'What the Father Left',
  'crossroad.feud_inherited.body':
    '{B} was four years old when it happened and has never spoken of it. {B} is not four years old now.',
  'crossroad.feud_inherited.let_it_be_settled.label': 'Let it be settled',
  'crossroad.feud_inherited.let_it_be_settled.cost': 'One of them will not see the winter',
  'crossroad.feud_inherited.send_b_away.label': 'Send {B} away',
  'crossroad.feud_inherited.send_b_away.cost': 'The valley loses a pair of hands and a name',
  'crossroad.feud_inherited.give_b_the_smithy.label': 'Give {B} the smithy',
  'crossroad.feud_inherited.give_b_the_smithy.cost': '{A} watches it happen',

  // --- A.9 chapel_or_granary ---
  'crossroad.chapel_or_granary.title': 'Timber Enough for One',
  'crossroad.chapel_or_granary.body':
    'There is standing timber for one great work and the season for it. {A} has been drawing a chapel in the dirt for two years. The reeve has been drawing a granary.',
  'crossroad.chapel_or_granary.the_chapel.label': 'The chapel',
  'crossroad.chapel_or_granary.the_chapel.cost': 'The next harvest comes in one fifth lighter',
  'crossroad.chapel_or_granary.the_granary.label': 'The granary',
  'crossroad.chapel_or_granary.the_granary.cost': '{A} will remember which was chosen',

  // --- A.10 relic_pedlar ---
  'crossroad.relic_pedlar.title': 'A Bone in a Box',
  'crossroad.relic_pedlar.body':
    'A man came up the ford road with a box and a story. He says it is the finger of a saint. {A} believes him. {B} has counted the price in grain.',
  'crossroad.relic_pedlar.buy_it.label': 'Buy it',
  'crossroad.relic_pedlar.buy_it.cost': 'Six weeks of bread',
  'crossroad.relic_pedlar.send_him_on.label': 'Send him on',
  'crossroad.relic_pedlar.send_him_on.cost': '{A} will preach about it for a year',
  'crossroad.relic_pedlar.take_the_box.label': 'Take the box and pay nothing',
  'crossroad.relic_pedlar.take_the_box.cost': 'He will tell the road what happened here',

  // --- §7.8 · the traders on the road ---
  'crossroad.cattle_drover.title': 'The Drover',
  'crossroad.cattle_drover.body':
    'He came over the ford with four beasts and wintered feed for two. He says he is from the far side of the downs, and that the grass failed there. {A} has looked at the cow. {B} has looked at the man.',
  'crossroad.cattle_drover.buy_the_cow.label': 'Buy the cow',
  'crossroad.cattle_drover.buy_the_cow.cost': 'A hundred and twenty of grain, and she is thin',
  'crossroad.cattle_drover.sell_him_pigs.label': 'Sell him two pigs',
  'crossroad.cattle_drover.sell_him_pigs.cost': 'Two of the pigs, and he pays in bread',
  'crossroad.cattle_drover.send_him_on.label': 'Send him on',
  'crossroad.cattle_drover.send_him_on.cost': 'He waters his beasts and goes',

  'crossroad.salt_carrier.title': 'Salt from the Coast',
  'crossroad.salt_carrier.body':
    'The salt man walks the same road every few summers and remembers who paid him last. He carries it in a sack on his own back, which is why he charges what he charges. {A} knows what salt does for a carcass. {B} knows what the sack costs.',
  'crossroad.salt_carrier.buy_the_salt.label': 'Buy the sack',
  'crossroad.salt_carrier.buy_the_salt.cost': 'Seventy of grain, and the meat keeps for years',
  'crossroad.salt_carrier.haggle.label': 'Haggle him down',
  'crossroad.salt_carrier.haggle.cost': 'Half the price and half the salt, and he remembers',
  'crossroad.salt_carrier.no_salt.label': 'Let him pass',
  'crossroad.salt_carrier.no_salt.cost': 'The granary keeps its grain and the meat keeps nothing',

  'crossroad.grain_factor.title': 'The Factor',
  'crossroad.grain_factor.body':
    'He buys grain for towns that do not grow it, and he pays in timber because timber is what the towns have too much of. He has already counted the granaries from the rise, and he will count them again for somebody else. {A} has the tally. {B} has not spoken.',
  'crossroad.grain_factor.sell_the_surplus.label': 'Sell him the surplus',
  'crossroad.grain_factor.sell_the_surplus.cost': 'A fifth of the granary, and the road learns what this valley keeps',
  'crossroad.grain_factor.keep_it_all.label': 'Keep it all',
  'crossroad.grain_factor.keep_it_all.cost': 'It goes on rotting, and {B} wanted that wood',

  // --- A.11 forest_cut ---
  'crossroad.forest_cut.title': 'The Old Wood',
  'crossroad.forest_cut.body':
    'The fields will not feed another winter of children. The nearest flat ground is under three hundred years of oak. {A} has walked it twice and come back with nothing to say.',
  'crossroad.forest_cut.fell_it.label': 'Fell it',
  'crossroad.forest_cut.fell_it.cost': 'The wood does not come back in a lifetime',
  'crossroad.forest_cut.take_the_edge.label': 'Take only the edge',
  'crossroad.forest_cut.take_the_edge.cost': 'Slower, and the children are hungry now',
  'crossroad.forest_cut.leave_it_standing.label': 'Leave it standing',
  'crossroad.forest_cut.leave_it_standing.cost': '{A} sleeps well; nobody else does',

  // --- A.12 wolf_winter ---
  'crossroad.wolf_winter.title': 'Tracks at the Palisade',
  'crossroad.wolf_winter.body':
    'Three nights running. On the third, they took something. {A} says it will be a child next.',
  'crossroad.wolf_winter.hunt_them.label': 'Hunt them',
  'crossroad.wolf_winter.hunt_them.cost': 'Men in the wood in February',
  'crossroad.wolf_winter.build_the_palisade.label': 'Build up the palisade',
  'crossroad.wolf_winter.build_the_palisade.cost': 'Timber that was meant for a house',
  'crossroad.wolf_winter.keep_everyone_inside.label': 'Keep everyone inside',
  'crossroad.wolf_winter.keep_everyone_inside.cost': 'Nothing gets done for a month',

  // --- A.13 strangers_at_the_ford ---
  'crossroad.strangers_at_the_ford.title': 'Nine at the Ford',
  'crossroad.strangers_at_the_ford.body':
    'Nine of them, with a cart and no oxen. They say their village is ash and will not say who burned it. {B} has counted the grain twice.',
  'crossroad.strangers_at_the_ford.take_them_in.label': 'Take them in',
  'crossroad.strangers_at_the_ford.take_them_in.cost': 'Nine more mouths before the harvest',
  'crossroad.strangers_at_the_ford.feed_them_and_send_them_on.label': 'Feed them and send them on',
  'crossroad.strangers_at_the_ford.feed_them_and_send_them_on.cost':
    'Sixty bushels, and they leave before nightfall',
  'crossroad.strangers_at_the_ford.turn_them_away.label': 'Turn them away',
  'crossroad.strangers_at_the_ford.turn_them_away.cost': 'The road will hear of it',

  // --- A.14 bandits ---
  'crossroad.bandits.title': 'Six Men and a Horse',
  'crossroad.bandits.body':
    'They came out of the north wood at noon so that everyone would see them. They want a third of the granary and they will be back in the spring.',
  'crossroad.bandits.pay_them.label': 'Pay them',
  'crossroad.bandits.pay_them.cost': 'And every spring after',
  'crossroad.bandits.fight_them.label': 'Fight them',
  'crossroad.bandits.fight_them.cost': '{B} leads it',
  'crossroad.bandits.wall_the_village_first.label': 'Wall the village first',
  'crossroad.bandits.wall_the_village_first.cost': 'They take the harvest while the ditch is dug',

  // --- A.15 succession ---
  'crossroad.succession.title': 'Who Speaks Now',
  'crossroad.succession.body':
    'The leader is buried. Two people in this valley expect to be asked, and only one of them is going to be.',
  'crossroad.succession.choose_a.label': '{A}',
  'crossroad.succession.choose_a.cost': '{B} will remember it',
  'crossroad.succession.choose_b.label': '{B}',
  'crossroad.succession.choose_b.cost': '{A} will remember it',
  'crossroad.succession.no_one.label': 'No one',
  'crossroad.succession.no_one.cost': 'The valley decides things by shouting for a while',

  // --- A.16 first_stone ---
  'crossroad.first_stone.title': 'The First Stone',
  'crossroad.first_stone.body':
    'There is nowhere left to build outward. {B} says the quarry on the east slope will give stone for a wall, or for houses, and that {A} will not live to see both finished.',
  'crossroad.first_stone.the_wall.label': 'The wall',
  'crossroad.first_stone.the_wall.cost': 'Cold houses for a generation',
  'crossroad.first_stone.the_houses.label': 'The houses',
  'crossroad.first_stone.the_houses.cost': 'The valley is rich and open',

  // --- A.17 quiet_years ---
  'crossroad.quiet_years.title': 'A Full Granary',
  'crossroad.quiet_years.body':
    'There is more grain than the winter needs, and {A} has been asked twice this week what is to be done with it.',
  'crossroad.quiet_years.a_free_work.label': 'Build while there is time',
  'crossroad.quiet_years.a_free_work.cost': 'Some of it goes to the men who dig',
  'crossroad.quiet_years.a_season_of_feasting.label': 'Eat it',
  'crossroad.quiet_years.a_season_of_feasting.cost': 'A winter shorter than it looks',
};

// ---------------------------------------------------------------------------
// The crossroads, as chronicle. design.md Annex A, §8, §9.
//
// Two kinds of key, and the second is the one the whole game is for.
//
// `crossroad.<template>.<option>` is what the village did, written the week it
// did it. `consequence.<seed>` is what came of it, written when the seed comes
// due — and it carries `{years}` and `{sinceYear}` so that the line can say how
// long ago the decision was. That is the sentence this game exists to produce:
// not "the lord's men came", but "thirty-one years after Osric knelt, the
// lord's men came for his grandson".
//
// A consequence line that cannot name its origin is a bug in the line, not a
// limitation of the engine (§8.5).
// ---------------------------------------------------------------------------

const CROSSROAD_CHRONICLE: Record<string, string[]> = {
  // --- A.1 winter_grain_debt ---
  'crossroad.winter_grain_debt.kneel': [
    '{A} knelt at the ford in year {year}, and the carts came up the road behind.',
    'In year {year} the valley took the rye and gave its name for it.',
    '{A} knelt. Three carts of rye, and Wealdmere had a new tenant.',
  ],
  'crossroad.winter_grain_debt.refuse': [
    '{A} sent the carts back down the road in year {year}.',
    'The riders waited two days at the ford and went home loaded. Year {year}.',
    'In year {year} the valley went hungry and stayed its own.',
  ],
  'crossroad.winter_grain_debt.take_it_at_night': [
    'The carts were lighter in the morning, and nobody said why. Year {year}.',
    'In year {year} the rye came into the granary in the dark.',
    '{A} took what was at the ford, and the village agreed it had not happened.',
  ],
  'consequence.tithe_due': [
    'The lord sent for what was owed. {years} years since {A} knelt at the ford.',
    'In year {year} the carts came the other way, {years} years after they first came up.',
    'Wealdmere took its due. It had been {years} years since year {sinceYear}.',
  ],
  'consequence.wealdmere_remembers': [
    'Wealdmere had not forgotten the carts sent back in year {sinceYear}. Riders again, {years} years on.',
    '{years} years after {A} refused them, there were men on the ridge.',
    'They came back in year {year}, as they had said they would in year {sinceYear}.',
  ],
  'consequence.the_reckoning': [
    'They came for the rye taken in year {sinceYear}. It had been {years} years.',
    '{years} years after the carts went light, the lord sent men to count.',
    'The reckoning for year {sinceYear} arrived armed, {years} years late.',
  ],

  // --- A.2 tithe_demand ---
  'crossroad.tithe_demand.pay_in_full': [
    'The lord had his quarter in the autumn of year {year}.',
    'They paid what the ledger said in year {year}, and said nothing.',
    '{A} loaded the carts himself that autumn.',
  ],
  'crossroad.tithe_demand.pay_short': [
    'They paid part of it in year {year} and hoped the count would hold.',
    '{A} gave the ledger a number of his own that autumn.',
    'The tithe went out short in year {year}.',
  ],
  'crossroad.tithe_demand.send_him_away': [
    '{B} sent the lord’s man back down the road in year {year}.',
    'The ledger left the valley unsigned that autumn.',
    'In year {year} they gave the counting man nothing but the road.',
  ],
  'consequence.double_tithe': [
    'They counted twice as hard, {years} years after the short payment of year {sinceYear}.',
    'The tithe came double in year {year}. The ledger of year {sinceYear} had been remembered.',
    '{years} years on, Wealdmere took what it thought it was owed.',
  ],
  'consequence.punitive_raid': [
    'The riders came back for the ledger of year {sinceYear}, {years} years later.',
    '{years} years after the counting man was sent away, they came with more than a ledger.',
    'They burned two houses in year {year} for what happened in year {sinceYear}.',
  ],

  // --- A.3 hungry_spring ---
  'crossroad.hungry_spring.sow_it': [
    'They put the last of it in the ground in the spring of year {year}.',
    '{A} sowed the seed corn and told the village to hold on until midsummer.',
    'The fields went in and the pots stayed empty. Spring, year {year}.',
  ],
  'crossroad.hungry_spring.eat_it': [
    'They ate the seed corn in the spring of year {year}.',
    '{B} counted the children and the seed went into the pot. Year {year}.',
    'The valley chose midsummer over autumn in year {year}.',
  ],
  'crossroad.hungry_spring.half_and_half': [
    'Half in the ground and half in the pot, spring of year {year}.',
    'They split the last of the grain in year {year} and both halves were short.',
    '{A} measured it out twice and neither measure was enough.',
  ],
  'consequence.lean_autumn': [
    'The harvest came in as thin as the sowing of year {sinceYear} had promised.',
    'What they ate in the spring of year {sinceYear} was not in the fields that autumn.',
    'A year after the seed corn went into the pot, in year {sinceYear}, the granary showed it.',
  ],

  // --- A.4 granary_theft ---
  'crossroad.granary_theft.believe_b': [
    'The village took {B} at his word in year {year}, and {A} left the table.',
    '{A} was put out of the counting in year {year}.',
    'They believed {B}, and {A} had nothing more to say.',
  ],
  'crossroad.granary_theft.believe_a': [
    'The village took {A} at her word in year {year}, and {B} went quiet.',
    'They believed {A}. {B} was still telling it his way years later.',
    'Nothing was proved, and {A} kept her place. Year {year}.',
  ],
  'crossroad.granary_theft.a_new_latch': [
    'They hung a new latch in year {year} and never said whose hand it was.',
    'A new latch, and everyone kept their own opinion. Year {year}.',
    'The matter was closed in year {year} without being settled.',
  ],
  'consequence.exile_returns': [
    '{A} came back up the ford road, {years} years after being put out.',
    'Three of them at the ford in year {year}, and one of them had been here in year {sinceYear}.',
    '{years} years is long enough to come back with company.',
  ],
  'consequence.the_feud': [
    'What was said over the granary in year {sinceYear} came due, {years} years on.',
    'The quarrel of year {sinceYear} was still there in year {year}, and it had grown.',
    '{years} years after the latch was broken, the village had two sides.',
  ],
  'consequence.rot_within': [
    'The valley had been keeping a secret since year {sinceYear}, and after {years} years it showed.',
    '{years} years of everyone knowing and nobody saying. Year {year}.',
    'What was not settled in year {sinceYear} settled itself in year {year}.',
  ],

  // --- A.5 plague_pit ---
  'crossroad.plague_pit.bless_them': [
    '{A} buried them one by one in year {year}, and it took the days it took.',
    'Every one of them was named over in the summer of year {year}.',
    'The ground was hard and they dug it anyway. Year {year}.',
  ],
  'crossroad.plague_pit.the_pit': [
    'They dug the pit in year {year}, and {A} would not stand at the edge of it.',
    'Lime and a pit, year {year}. It was quicker.',
    'In year {year} the dead went in together.',
  ],
  'crossroad.plague_pit.burn_the_houses': [
    'They burned two houses with the dead still in them. Year {year}.',
    'In year {year} the sickness was answered with fire.',
    'Two roofs went up in year {year}, and the sickness stopped soon after.',
  ],
  'consequence.unquiet_ground': [
    'The ground where the pit was dug in year {sinceYear} was still avoided {years} years later.',
    'Nobody would walk there. It had been {years} years.',
    '{years} years on, the valley had not made its peace with year {sinceYear}.',
  ],
  'consequence.the_burnt_row': [
    'The burnt row of year {sinceYear} was never built on. {years} years of nettles.',
    '{years} years later the two plots were still black.',
    'Nobody put a roof back where the fires were in year {sinceYear}.',
  ],

  // --- A.6 plague_blame ---
  'crossroad.plague_blame.give_them_b': [
    'They gave {A} what he asked for in year {year}, and {B} did not see the winter.',
    '{B} was taken in year {year}, and the sickness eased after.',
    'In year {year} the village found a reason, and the reason had a name.',
  ],
  'crossroad.plague_blame.silence_a': [
    '{A} was told to stop preaching in year {year}, and did.',
    'They took the pulpit from {A} in year {year}.',
    'In year {year} the village chose its neighbours over its priest.',
  ],
  'crossroad.plague_blame.say_nothing': [
    'Nobody answered {A} in year {year}, and the sickness went on.',
    'The village said nothing that summer and waited it out.',
    'In year {year} they let it burn itself out, and it took its time.',
  ],
  'consequence.blood_debt': [
    'What was done to {B} in year {sinceYear} was still owed {years} years later.',
    '{years} years on, somebody was still counting year {sinceYear}.',
    'The debt from year {sinceYear} came due in year {year}.',
  ],
  'consequence.no_shepherd': [
    'There had been no priest since year {sinceYear}. {years} years of it.',
    '{years} years without anyone to say the words. Year {year}.',
    'The chapel had stood empty since year {sinceYear}.',
  ],
  'consequence.whispers': [
    'What was left unsaid in year {sinceYear} was being said out loud {years} years later.',
    '{years} years of whispering, and in year {year} it had names in it.',
    'The silence of year {sinceYear} did not hold.',
  ],

  // --- A.7 smith_feud ---
  'crossroad.smith_feud.side_with_a': [
    'The village took {A}’s part in year {year}, and {B} stopped coming to the square.',
    '{B} withdrew after year {year} and worked alone.',
    'They sided with {A}. The forge went cold that season.',
  ],
  'crossroad.smith_feud.side_with_b': [
    'The village took {B}’s part in year {year}, and {A} stopped coming to the square.',
    '{A} withdrew after year {year} and worked alone.',
    'They sided with {B}. The forge went cold that season.',
  ],
  'crossroad.smith_feud.build_together': [
    'They were set to the same work in year {year} and neither of them liked it.',
    '{A} and {B} built the palisade between them in year {year}.',
    'The wall went up in year {year}. They did not speak while it did.',
  ],
  'consequence.the_withdrawn': [
    '{years} years after the quarrel of year {sinceYear}, three left by the ford road.',
    'The withdrawal of year {sinceYear} lasted {years} years, and ended with three leaving.',
    'Three walked out in year {year}, after {years} years of the old quarrel.',
  ],
  'consequence.uneasy_truce': [
    'The truce of year {sinceYear} held for {years} years and then it did not.',
    '{years} years of civility, and in year {year} it came apart worse than before.',
    'What was patched in year {sinceYear} tore again in year {year}.',
  ],

  // --- A.8 feud_inherited ---
  'crossroad.feud_inherited.let_it_be_settled': [
    'They let it be settled in year {year}, and one of them was buried for it.',
    'In year {year} the village stood back and let the old business end.',
    'It ended in year {year}, the way it had been going to for twenty years.',
  ],
  'crossroad.feud_inherited.send_b_away': [
    '{B} was sent down the ford road in year {year}.',
    'In year {year} the valley solved it by making it smaller.',
    'They put {B} on the road in year {year}, and {A} watched from the ridge.',
  ],
  'crossroad.feud_inherited.give_b_the_smithy': [
    '{B} was given the forge in year {year}, and {A} said nothing about it.',
    'The smithy passed to {B} in year {year}.',
    'In year {year} they made {B} the smith, in front of {A}.',
  ],
  'consequence.the_returned': [
    '{B} came back {years} years after being sent away, and not alone.',
    'The road brought {B} back in year {year}. It had been {years} years.',
    '{years} years is long enough to make a life somewhere else and come back anyway.',
  ],
  'consequence.two_smiths': [
    'The valley had two people who thought the forge was theirs, {years} years on from year {sinceYear}.',
    '{years} years after the forge changed hands, it was still being argued.',
    'What was given away in year {sinceYear} was still being counted in year {year}.',
  ],

  // --- A.9 chapel_or_granary ---
  'crossroad.chapel_or_granary.the_chapel': [
    'The timber went to the chapel in year {year}.',
    'In year {year} they raised the chapel and left the granary drawn in the dirt.',
    '{A} got the chapel in year {year}, and the reeve got nothing.',
  ],
  'crossroad.chapel_or_granary.the_granary': [
    'The timber went to the granary in year {year}.',
    'In year {year} they built for the winter, and {A} watched it go up.',
    'They chose the granary in year {year}. The chapel stayed a drawing.',
  ],
  'consequence.the_faithful_valley': [
    'They came for the chapel raised in year {sinceYear}, {years} years after it went up.',
    '{years} years on, the valley had a name for its faith, and people walked to it.',
    'The chapel of year {sinceYear} had brought four strangers by year {year}.',
  ],
  'consequence.a_priest_without_a_roof': [
    '{A} left the valley {years} years after the granary went up instead.',
    'There had been no roof for the priest since year {sinceYear}. After {years} years there was no priest.',
    '{years} years of preaching in the open, and then not.',
  ],

  // --- A.10 relic_pedlar ---
  'crossroad.cattle_drover.buy_the_cow': [
    'They bought a cow off a drover in year {year}. She was thin, and she lasted.',
    'In year {year} the valley paid grain for a beast from the far downs.',
    '{A} bought the cow, and {B} said nothing about the price.',
  ],
  'crossroad.cattle_drover.sell_him_pigs': [
    'Two pigs went down the road with the drover in year {year}, and bread came back.',
    'In year {year} they sold the pigs rather than feed them through another winter.',
    '{B} counted the bread twice and called it a good trade.',
  ],
  'crossroad.cattle_drover.send_him_on': [
    'The drover watered his beasts and went on, in year {year}.',
    'In year {year} they let the cattle pass and kept the granary shut.',
    '{A} watched the beasts go over the ford and said it was the wrong year for it.',
  ],
  'crossroad.salt_carrier.buy_the_salt': [
    'They bought a sack of salt in year {year}, and the meat kept for years after.',
    'In year {year} the valley paid for salt, which nobody could eat and everybody needed.',
    '{A} put the salt where the rain would not find it.',
  ],
  'crossroad.salt_carrier.haggle': [
    'They beat the salt man down in year {year}, and got half a sack for it.',
    'In year {year} {B} argued the price and the salt ran out early.',
    'The salt man took what he was offered, and remembered the valley for it.',
  ],
  'crossroad.salt_carrier.no_salt': [
    'The salt went past the valley in year {year} on the man\u2019s own back.',
    'In year {year} they kept the grain and let the salt walk on.',
    '{A} said they would manage without, and for a while they did.',
  ],
  'crossroad.grain_factor.sell_the_surplus': [
    'They sold a fifth of the granary for timber in year {year}, and were talked about for it.',
    'In year {year} the valley traded bread for wood, having cut its own.',
    '{B} had the timber stacked before the factor was over the rise.',
  ],
  'crossroad.grain_factor.keep_it_all': [
    'The factor was turned away in year {year}, and the granary stayed full.',
    'In year {year} they kept the grain, and the woodward kept his opinion.',
    '{B} wanted that wood, and said so for a year afterwards.',
  ],
  'crossroad.relic_pedlar.buy_it': [
    'They bought the box in year {year}, and it cost six weeks of bread.',
    'In year {year} the valley paid for a finger bone in grain.',
    '{A} put the relic in the chapel in year {year}.',
  ],
  'crossroad.relic_pedlar.send_him_on': [
    'The pedlar was sent on his way in year {year}, box and all.',
    '{B} would not pay for it, and the man went down the road. Year {year}.',
    'In year {year} they kept the grain and lost the bone.',
  ],
  'crossroad.relic_pedlar.take_the_box': [
    'They kept the box and paid nothing for it in year {year}.',
    'In year {year} the pedlar left the valley with a story instead of grain.',
    '{B} took the box in year {year}. The road heard about it.',
  ],
  'consequence.the_relic_works': [
    'They were still walking to the box bought in year {sinceYear}, {years} years later.',
    '{years} years on, the relic of year {sinceYear} had a reputation.',
    'Three came up the road in year {year} for something bought {years} years before.',
  ],
  'consequence.no_one_comes': [
    'Nobody had come up the ford road since year {sinceYear}. {years} years of it.',
    '{years} years and not one stranger. The road had heard about year {sinceYear}.',
    'The valley had been on its own since year {sinceYear}.',
  ],

  // --- A.11 forest_cut ---
  'crossroad.forest_cut.fell_it': [
    'They took the old wood down in year {year} and put two fields where it stood.',
    'In year {year} three hundred years of oak went for firewood and furrows.',
    '{A} marked the trees in year {year} and did not watch them come down.',
  ],
  'crossroad.forest_cut.take_the_edge': [
    'They took the edge of the wood in year {year} and left the rest.',
    'One field out of the treeline in year {year}.',
    'In year {year} they cut what they had to and stopped.',
  ],
  'crossroad.forest_cut.leave_it_standing': [
    'The old wood was left standing in year {year}.',
    'In year {year} they went hungry rather than cut it.',
    '{A} kept the wood in year {year}, and the village kept the hunger.',
  ],
  'consequence.bare_slopes': [
    'The slopes cut bare in year {sinceYear} took the rain badly, {years} years on.',
    '{years} years after the oaks came down, the water came off the hill wrong.',
    'What was felled in year {sinceYear} was still not back in year {year}.',
  ],
  'consequence.the_wood_holds': [
    'The wood kept in year {sinceYear} was still standing {years} years later, and people came for it.',
    '{years} years on, the valley was known for the wood it did not cut.',
    'Three came up the road in year {year} to see the oaks of year {sinceYear}.',
  ],

  // --- A.12 wolf_winter ---
  'crossroad.wolf_winter.hunt_them': [
    'They went into the wood after them in the winter of year {year}.',
    '{A} took men into the trees in February of year {year}.',
    'In year {year} the valley hunted, and came back with meat and one fewer.',
  ],
  'crossroad.wolf_winter.build_the_palisade': [
    'They put up more palisade in the winter of year {year}.',
    'Timber meant for a house went into the fence. Year {year}.',
    'In year {year} they answered the tracks with a wall.',
  ],
  'crossroad.wolf_winter.keep_everyone_inside': [
    'Nobody went out for a month in the winter of year {year}.',
    'In year {year} the valley shut its doors and waited.',
    'They stayed indoors that February, and nothing got built.',
  ],
  'consequence.the_long_indoors': [
    'The month indoors in year {sinceYear} was still being felt a year on.',
    'A year after the doors were shut in year {sinceYear}, the work had not caught up.',
    'What was not done in the winter of year {sinceYear} was not done in year {year} either.',
  ],

  // --- A.13 strangers_at_the_ford ---
  'crossroad.strangers_at_the_ford.take_them_in': [
    'Nine came in at the ford in year {year} and stayed.',
    'In year {year} the valley took in nine and asked no more questions.',
    '{A} let them through in year {year}. Nine more at the table.',
  ],
  'crossroad.strangers_at_the_ford.feed_them_and_send_them_on': [
    'They were fed and sent on in year {year}.',
    'In year {year} the valley gave what it could and kept its beds.',
    'They ate at the ford and walked on. Year {year}.',
  ],
  'crossroad.strangers_at_the_ford.turn_them_away': [
    'They were turned back at the ford in year {year}.',
    'In year {year} the valley closed the road to nine of them.',
    '{A} sent them away in year {year}, and the road remembered.',
  ],
  'consequence.whoever_burned_it': [
    'Whoever burned their village in year {sinceYear} found this one, {years} years on.',
    '{years} years after the nine came in, the men who chased them came too.',
    'They had not said who burned it. {years} years on, the valley found out.',
  ],

  // --- A.14 bandits ---
  'crossroad.bandits.pay_them': [
    'They paid the six men a third of the granary in year {year}.',
    'In year {year} the valley bought a quiet spring.',
    '{A} counted it out and watched it go north. Year {year}.',
  ],
  'crossroad.bandits.fight_them': [
    '{B} led them out against the six in year {year}.',
    'In year {year} the valley fought for its granary and kept it.',
    'They met them in the open in year {year}, and buried some of their own after.',
  ],
  'crossroad.bandits.wall_the_village_first': [
    'They dug and fenced through the harvest of year {year}.',
    'In year {year} the valley chose the wall over the wheat.',
    'The palisade went round in year {year}, and the fields went short.',
  ],
  'consequence.the_spring_visit': [
    'They came back in the spring, as they had said in year {sinceYear}.',
    '{years} years of paying, and they came again in year {year}.',
    'The spring visit was a habit now. It had started in year {sinceYear}.',
  ],
  'consequence.a_name_in_the_valley': [
    'The stand made in year {sinceYear} was still worth something {years} years later.',
    '{years} years on, people knew what happened here in year {sinceYear}.',
    'The valley had a name after year {sinceYear}, and it kept it {years} years.',
  ],

  // --- A.15 succession ---
  'crossroad.succession.choose_a': [
    '{A} was made head of the valley in year {year}, and {B} was not.',
    'They turned to {A} in year {year}. {B} said nothing at the time.',
    'In year {year} the valley chose {A}.',
  ],
  'crossroad.succession.choose_b': [
    '{B} was made head of the valley in year {year}, and {A} was not.',
    'They turned to {B} in year {year}. {A} said nothing at the time.',
    'In year {year} the valley chose {B}.',
  ],
  'crossroad.succession.no_one': [
    'Nobody was chosen in year {year}, and the valley argued instead.',
    'In year {year} the seat was left empty.',
    'They could not agree in year {year}, so they did not.',
  ],
  'consequence.the_passed_over': [
    '{years} years after being passed over in year {sinceYear}, {B} had not let it go.',
    'What was decided in year {sinceYear} was still being resented {years} years later.',
    '{years} years is a long time to be the one who was not asked.',
  ],
  'consequence.the_leaderless_years': [
    'The valley had gone {years} years without anyone to speak for it.',
    '{years} years of shouting in the square, since year {sinceYear}.',
    'Nobody had taken the seat left empty in year {sinceYear}.',
  ],

  // --- A.16 first_stone ---
  'crossroad.first_stone.the_wall': [
    'The first stone went into the wall in year {year}.',
    'In year {year} the quarry went to the wall and the houses stayed timber.',
    '{B} cut the first block in year {year}, and {A} did not live to see the last.',
  ],
  'crossroad.first_stone.the_houses': [
    'The first stone went into a house in year {year}.',
    'In year {year} the quarry went to the roofs and the valley stayed open.',
    '{B} cut the first block in year {year}. The wall stayed a drawing.',
  ],
  'consequence.behind_the_wall': [
    'The wall begun in year {sinceYear} had kept the valley to itself for {years} years.',
    '{years} years behind stone, and fewer people came up the road.',
    'Nobody had troubled the valley since the wall closed in year {sinceYear}.',
  ],
  'consequence.worth_taking': [
    'The stone houses raised in year {sinceYear} had been noticed. {years} years on, by the wrong people.',
    '{years} years of being worth looking at, and in year {year} somebody looked.',
    'What was built to last in year {sinceYear} was worth taking by year {year}.',
  ],

  // --- A.17 quiet_years ---
  'crossroad.quiet_years.a_free_work': [
    'The surplus of year {year} went into a granary.',
    'In year {year} they built with what they did not need to eat.',
    '{A} put the extra grain to work in year {year}.',
  ],
  'crossroad.quiet_years.a_season_of_feasting': [
    'They ate well through the winter of year {year}.',
    'In year {year} the valley spent a good year on itself.',
    '{A} opened the granary in year {year}, and nobody counted for a season.',
  ],

  // --- M-39 · quarrels, design.md §6.4, §7.9 ---
  'quarrel.words': [
    '{name} and {other} had words in front of everybody, in year {year}.',
    'It came out between {name} and {other} that {season}, and loudly.',
    'Nobody was surprised when {name} and {other} stopped speaking that year.',
  ],
  'quarrel.blows': [
    '{name} and {other} came to blows in year {year}. It had been coming.',
    'They pulled {name} off {other} that {season}, and neither would say why.',
    'There was blood between {name} and {other} in year {year}, and the valley picked sides.',
  ],

  // --- M-29 · the herd, design.md §7.7 ---
  'herd.slaughtered.hens': [
    'They ate the hens that {season}.',
    '{count} of the hens went into the pot in year {year}.',
    'The hens were the first to go, in the {season} of year {year}.',
  ],
  'herd.slaughtered.pigs': [
    'They killed {count} of the pigs early that year.',
    'They took {count} of the pigs before the winter was through.',
    '{count} pigs, and the year had not turned yet.',
  ],
  'herd.slaughtered.cows': [
    'They killed the cow in year {year}. Nobody said anything.',
    '{count} of the cattle went, and that was the last of the milk.',
    'The cattle were the last thing left to eat, and {count} of them went.',
  ],
  'herd.murrain.hens': [
    'A sickness went through the hens in year {year}.',
    'The hens sickened that {season}, and {count} of them died.',
    'Something got into the henhouse that was not a fox, and {count} died.',
  ],
  'herd.murrain.pigs': [
    'Murrain took {count} of the pigs in year {year}.',
    'The pigs sickened that {season}. They burned what was left of them.',
    'A sickness in the sty, and {count} of them gone before the week was out.',
  ],
  'herd.murrain.cows': [
    'Murrain came for the cattle in year {year}, and took {count}.',
    'The cattle sickened that {season}. It was the year everyone remembered.',
    'They lost {count} of the cows to the murrain, and the milk with them.',
  ],
  'herd.wolves.hens': [
    'Wolves came down for the hens that winter.',
    'Something took the hens in the night. The tracks were wolves.',
    'A wolf had the henhouse open before anyone woke, in year {year}.',
  ],
  'herd.wolves.pigs': [
    'Wolves took a pig in the winter of year {year}.',
    'A pig went in the night. There was blood on the snow.',
    'The wolves were bold that {season}, and a pig paid for it.',
  ],
  'herd.wolves.cows': [
    'Wolves killed a cow in the winter of year {year}.',
    'They found the cow at first light, and the wolves long gone.',
    'A cow, taken in the dark. Nothing between the valley and the trees.',
  ],

  // --- M-29 · hunting and fishing, design.md §7.7, §5.2 ---
  'crows.light': [
    'The crows had some of it before the reaping.',
    'Birds took a little of the year, as birds do.',
    'They lost {count} in the hundred to the crows that {season}.',
  ],
  'crows.heavy': [
    'The crows had {count} in the hundred that year. Nobody stood in the field.',
    'Birds went through the ripe grain of year {year} and there was no one to move them on.',
    'They watched the crows take the year, and had nobody to spare for it.',
  ],
  //
  // **Cinco variantes cada una, y con causa.** Desde que la temporada se cuenta
  // una vez y no cada semana, éstas son lo primero que el valle dice de un año
  // malo, y el jugador las lee unas cuarenta veces en cuarenta años. Las tres
  // primeras de cada grupo son las de siempre; las dos nuevas dicen **por qué**
  // se va la gente al monte, que es lo que convierte un comentario en una
  // noticia: el granero no llega a la siega.
  'forage.hunt': [
    '{count} of them went to the woods that {season}, and not for timber.',
    'They hunted the woods in year {year}. The fields would not be enough.',
    'The granary was low, so {count} took to the trees.',
    '{count} went up into the trees, with the store this far from the reaping.',
    'Short of bread in {season}, the valley sent {count} after meat.',
  ],
  'forage.fish': [
    'They fished the river that {season}.',
    '{count} of them worked the river in year {year}, for want of bread.',
    'The river fed them that {season}. It had not been asked before.',
    'With the granary this low, {count} of them took to the water.',
    'The fields came up short, so the river was asked instead.',
  ],
  // Y que la temporada se acabe. Peso 1: es la crónica, no la pantalla —el
  // aviso de §11.6 sólo saca lo de peso 2 o más, y «se volvió a comer del
  // campo» no es una noticia, es el final de una.
  'forage.ends': [
    'By {season} the fields were enough again.',
    'They came back from the woods that {season}.',
    'The hunting stopped in the {season} of year {year}. There was bread.',
    'Nobody went to the trees after that {season}.',
  ],
  'forage.both': [
    'The woods and the river both, that {season}. It was that kind of year.',
    '{count} of them left the fields for the trees and the water.',
    'They took what the valley would give in year {year}, and it was not grain.',
    'Bread ran short in {season}, and {count} went after whatever else there was.',
    'The granary would not last the year. They hunted and they fished.',
  ],

  // --- M-23 · welcome digest, design.md §9.2, §13.2 ---
  'welcome.time': [
    '{weeks} weeks passed.',
    'It has been {weeks} weeks.',
    '{weeks} weeks, and nobody was watching.',
  ],
  // Y la misma línea cuando la ausencia se mide en años. El letargo llega a
  // cuatro horas de reloj de pared (§13.4), que son novecientas sesenta
  // semanas: «960 weeks passed» no es una frase que nadie pueda sentir.
  // `years` es una cuenta de años transcurridos, no un año absoluto, así que
  // `render.ts` no le suma uno — ver `ABSOLUTE_YEARS`.
  'welcome.time.years': [
    '{years} years passed.',
    'It has been {years} years.',
    '{years} years, and nobody was watching.',
    'The valley went {years} years without anyone looking.',
  ],
  'welcome.people': [
    '{people} people now. {born} born, {died} died, {arrived} arrived, {left} left.',
    '{people} in the valley now — {born} born, {died} died, {arrived} arrived, {left} left since.',
    'The valley counts {people} now: {born} born, {died} died, {arrived} arrived, {left} left.',
  ],
  'welcome.buildings': [
    '{built} raised, {lost} lost.',
    '{built} went up, {lost} came down.',
    'Building: {built} raised, {lost} lost.',
  ],

  // --- the founding (U-04) ---
  //
  // The first thing a new game says, and the only thing it says unasked. Not a
  // tutorial: the sentence names the place, the year and how many they are, and
  // the four figures of §11.1.1 sit on screen underneath it. The head count is a
  // param read off the state, not a number written into the prose, so the line
  // cannot drift from the founding it describes.
  'founding.settled': [
    'They stopped where the river turns, the two of them, in the {season} of year {year}.',
    'They came up the valley in year {year}, a man and a woman, and did not go on.',
    'The valley had nobody in it until year {year}, and then it had two.',
  ],

  // --- E5 · qué valle es éste (docs/plan-juego.md) ---
  //
  // Se dice **una vez, en la fundación**, y es lo que hace que un rasgo sea una
  // historia y no un modificador oculto: el jugador tiene que saber en qué sitio
  // está para que su postura sea una decisión y no una apuesta. Voz de §9.3, y
  // dicho como lo diría alguien que acaba de llegar y ha mirado el suelo.
  'valley.good_clay': [
    'The clay here takes a wall without complaint. That is worth knowing.',
    'Good clay under the turf, the kind that holds a wall up.',
    'Whatever else the valley wanted for, it had clay.',
  ],
  'valley.thin_soil': [
    'The soil is thin over stone. It will give, but not much.',
    'A spade goes down a hand and finds rock. The fields will be honest work.',
    'Thin ground. Nobody said the valley was generous.',
  ],
  'valley.old_forest': [
    'The trees here are old, and thick through. There is wood in them for years.',
    'Old wood on the slopes, the kind that takes two days to fell and pays for it.',
    'The forest has been standing a long time, and it shows in the trunks.',
  ],
  'valley.bare_hills': [
    'The hills are bare. There is little stone lying about to build with.',
    'Hardly an outcrop in sight. Stone will have to be looked for.',
    'Bare slopes, and not a boulder field worth the name.',
  ],

  // --- E4 · lo que la aldea contesta a una orden (docs/plan-juego.md) ---
  //
  // La voz de siempre (§9.3): concreta, sin exclamaciones, sin juzgar al
  // jugador. **Y con alguien dentro** — no «no hay campos» sino «el alguacil
  // dice que no hay campos», porque una orden se la da a alguien y quien
  // contesta es ese alguien. Es la misma diferencia que hay entre un mensaje de
  // error y una persona.
  'answer.no_more_fields': [
    'The reeve says there are {count} fields and no hands idle to break another.',
    'There are {count} fields, and sowing heavier means breaking new ground first.',
    'The reeve counted {count} fields and shrugged. Ground has to be broken before it is sown.',
  ],
  'answer.no_more_hands': [
    'The reeve says a field cannot be worked by fewer than two, and there are no more pairs.',
    'These hands can crew {count} fields, and no order changes that.',
    'The reeve will not split the crews thinner. A half-worked field yields nothing.',
  ],
  'answer.all_the_land': [
    'That is every acre the valley has, and there is no more ground to break.',
    'The valley holds {count} fields and has no room for another.',
    'The reeve says the ground has run out before the will did.',
  ],
  'answer.someone_must_build': [
    'Someone has to keep building, or the valley stops being one.',
    'The reeve keeps a few back from the wood. Roofs do not mend themselves.',
    'Not everyone goes to the trees. Something always needs raising.',
  ],
  'answer.no_wood_to_build': [
    'Nothing can be raised without timber, whatever it is meant to be.',
    'The works wait on the wood.',
    'The carpenters are standing about. There is no timber to give them.',
  ],

  // --- milestones (§11.6) ---
  //
  // `src/ui/milestones.ts`. Not what a tick did (that is the rest of this
  // bank) but what the village has never done before: the first of a kind of
  // building, a new peak of people, a decade or a century, a second stone
  // upgrade after the first. Same rules as the rest of §9.3: short, concrete,
  // no exclamation marks, the drama in the fact and not the prose.
  // **En presente, y sin fecha.** Éste era el otro lado de «los mensajes entre
  // eras son horrorosos», y no era la prosa: era el **tiempo verbal**. Un hito
  // sale en pantalla en el instante en que pasa, y decía «the first house went
  // up in the spring of year 4» —en pasado, y con la fecha que la cabecera ya
  // está mostrando dos centímetros más arriba—. Era un libro de historia
  // interrumpiendo a un jugador que está viendo ocurrir la cosa.
  //
  // Estas claves las lee **sólo** la cartela de §11.6, nunca la crónica (que
  // tiene sus propias `built.*` en pasado, donde el pasado es lo correcto), así
  // que aquí el presente no choca con nada. La fecha se quita entera: el año lo
  // dice la cabecera y la estación también.
  'milestone.first_of_kind.house': [
    'There is a house in the valley, the first anyone here has raised.',
    'The first roof is up.',
    'A house stands where there was grass.',
  ],
  'milestone.first_of_kind.field': [
    'The first field is broken and sown.',
    'There is ploughed ground in the valley now.',
    'The first furrows are cut.',
  ],
  'milestone.first_of_kind.granary': [
    'There is somewhere to keep the grain now.',
    'The first granary stands.',
    'The grain has a roof over it now.',
  ],
  'milestone.first_of_kind.well': [
    'The first well is dug. Nobody carries from the river.',
    'There is water inside the village now.',
    'The well is sunk, and the walk to the river is over.',
  ],
  'milestone.first_of_kind.chapel': [
    'There is a chapel — somewhere to pray that is not an open field.',
    'The first chapel stands.',
    'The valley has a chapel now.',
  ],
  'milestone.first_of_kind.smithy': [
    'The forge is lit for the first time.',
    'There is a smith at work in the valley.',
    'The first smithy stands, and the hammer carries.',
  ],
  'milestone.first_of_kind.mill': [
    'The mill is turning.',
    'The first mill stands over the water.',
    'There is a mill now, and the grain goes further.',
  ],
  'milestone.first_of_kind.palisade': [
    'The first stretch of palisade is up.',
    'There are stakes where there was open ground.',
    'The valley is fenced, in part.',
  ],
  'milestone.first_of_kind.wall': [
    'The first stone wall stands where the stakes did.',
    'They are building in stone against attack now.',
    'The first length of wall is set.',
  ],
  'milestone.first_of_kind.church': [
    'The chapel is a church now.',
    'There is a church where the chapel stood.',
    'The first church stands over the valley.',
  ],
  'milestone.first_of_kind.stone_house': [
    'The first house in stone. It will not burn.',
    'A house that fire cannot take now stands.',
    'One roof is stone from here on.',
  ],
  'milestone.first_of_kind.watchtower': [
    'There is a tower watching the road.',
    'The first watchtower stands.',
    'Someone is above the valley now, watching.',
  ],
  'milestone.first_of_kind.grave_yard': [
    'The dead have ground of their own now.',
    'The first burying ground is walled off.',
    'There is a graveyard in the valley.',
  ],

  'milestone.work_done.chapel': [
    'A second chapel stands.',
    'Another chapel is finished.',
    'There is more than one chapel now.',
  ],
  'milestone.work_done.smithy': [
    'Another forge is lit.',
    'A second smithy stands.',
    'There is more than one hammer in the valley.',
  ],
  'milestone.work_done.well': [
    'Another well is dug.',
    'A second well, and shorter walks with the buckets.',
    'There is more water within reach.',
  ],
  'milestone.work_done.mill': [
    'Another mill is turning.',
    'A second mill stands.',
    'There is more than one mill now.',
  ],
  'milestone.work_done.church': [
    'Another church is finished.',
    'A second church stands.',
    'There is more than one church in the valley.',
  ],
  'milestone.work_done.stone_house': [
    'Another house is stone now. It will not burn.',
    'One more roof out of the reach of fire.',
    'A second house has been rebuilt in stone.',
  ],
  'milestone.work_done.watchtower': [
    'Another tower watches the valley.',
    'A second watchtower stands.',
    'There is one more tower over the road.',
  ],
  'milestone.work_done.grave_yard': [
    'The burying ground is wider now.',
    'More ground has been walled off for the dead.',
    'The graveyard has been widened.',
  ],

  'milestone.peak_people': [
    '{people} in the valley. It has never held so many.',
    'There have never been {people} here before.',
    'The valley is {people} strong, and it has never been more.',
  ],

  // `{years}` es una cuenta de años transcurridos, no un año absoluto, así que
  // `render.ts` no le suma uno — y no debe sumárselo. Ver `ABSOLUTE_YEARS`.
  'milestone.turn_of_decade': [
    '{years} years since they came over the ridge.',
    'The valley has stood {years} years.',
    '{years} years, and the village is still here.',
  ],
  'milestone.turn_of_century': [
    'A hundred years since they came over the ridge.',
    'The valley has stood a century.',
    'A century, and the village is still here.',
  ],
};

/** Stable interface copy: unlike chronicle prose, labels do not vary by seed. */
export const UI_BANK: Record<string, string> = {
  'app.valley': 'The valley',
  'app.close': 'Close',
  // E1 · El mando. Las dos únicas cosas que el jugador manda de forma continua,
  // y se nombran **con palabras y no con cifras** (§11.1): «sembrar de más» es
  // una orden que un alguacil entendería, «1,5×» no. Tres posiciones cada una,
  // porque tres es una decisión y cinco es un dial.
  'app.orders': 'Standing orders',
  // La línea que resume las tres órdenes con la hoja cerrada (`app.ts`). Las
  // posiciones entran en minúscula porque van en mitad de una frase.
  'app.orders.now': 'Sowing {sowing} · hands to {hands} · building {build}',
  'app.orders.open': 'Change the standing orders',
  // El botón de velocidad enseña la velocidad de ahora; esto es lo que anuncia.
  'app.speed.open': 'Change the speed',
  'app.sowing': 'Sowing',
  'app.sowing.lean': 'Lean',
  'app.sowing.enough': 'Enough',
  'app.sowing.heavy': 'Heavy',
  'app.hands': 'Spare hands',
  'app.hands.works': 'Build',
  'app.hands.both': 'Both',
  'app.hands.wood': 'Wood',
  // E3 · La tercera orden: qué se levanta antes. Seis posiciones y no tres,
  // porque aquí cada una no es «más o menos» de lo mismo, es otra cosa — quien
  // quiere una capilla no quiere «algo más de capilla».
  'app.build': 'Build first',
  'app.build.none': 'As needed',
  'app.build.food': 'Food',
  'app.build.shelter': 'Roofs',
  'app.build.craft': 'Trades',
  'app.build.faith': 'Faith',
  'app.build.defence': 'Walls',
  'app.year': 'ANNO {year}',
  // U-12 · el reloj de la cabecera (v3.72). Reemplaza al título «ANNO I», que
  // se queda donde sigue teniendo sentido: las cabeceras de año de la crónica.
  // Lo pidió el dueño del diseño: «un contador con horas incluso». La hora va
  // rellena a dos dígitos por quien la pinta, para que no baile de ancho.
  'app.clock.time': '{hour}:00',
  'app.clock.date': 'Year {year} · {season}, day {day}',
  'app.speed.controls': 'Simulation speed',
  'app.speed.pause': 'Pause',
  'app.speed.multiplier': '{speed}×',
  // §11.1.1 · la tira de la aldea. Cuatro cifras y sus nombres para el lector
  // de pantalla; lo que se ve es el icono y el número.
  // U-02 · el rótulo de la cartela de un hito (`src/ui/moment.ts`): qué clase
  // de cosa es, en dos o tres palabras y en versalitas. No es un título ni una
  // celebración — es una etiqueta en una página de la crónica, y por eso vive
  // aquí y no en el banco de frases, cuya forma exige tres variantes y punto
  // final.
  'founding.label': 'The valley is settled',
  'milestone.kind.first_of_kind': 'The first of its kind',
  'milestone.kind.peak_people': 'Never so many',
  'milestone.kind.turn_of_decade': 'A turn of the years',
  'milestone.kind.work_done': 'The work is finished',
  // U-05 · la barra de abajo (`src/ui/app.ts`): tres destinos, etiqueta corta.
  'nav.bar': 'Where to look',
  'nav.valley': 'Valley',
  'nav.chronicle': 'Chronicle',
  'nav.people': 'People',
  'app.vitals': 'The village at a glance',
  'app.vitals.people': '{count} villagers',
  'app.vitals.food': 'Food for {weeks} weeks',
  'app.vitals.wood': '{count} wood',
  'app.vitals.morale': 'Spirits {value} of 100',
  // La línea de estado de la tira (`src/ui/doing.ts`). **Interfaz y no crónica**:
  // una sola forma por clave, sin variantes, porque una etiqueta que cambia de
  // palabras cada vez que se mira no es una etiqueta. Presente, corta, y dicha
  // en lo que el jugador puede hacer con ella.
  'doing.hungry': 'The granary is low.',
  'doing.cold': 'The woodpile will not last the winter.',
  'doing.nothing': 'Nothing is being built.',
  'doing.waiting_wood': 'The next work is waiting on timber.',
  'doing.raising.field': 'They are breaking a new field.',
  'doing.raising.house': 'They are raising a house.',
  'doing.raising.granary': 'They are raising a granary.',
  'doing.raising.well': 'They are digging the well.',
  'doing.raising.chapel': 'They are raising the chapel.',
  'doing.raising.smithy': 'They are raising the smithy.',
  'doing.raising.mill': 'They are raising the mill.',
  'doing.raising.palisade': 'They are fencing the village.',
  'doing.raising.grave_yard': 'They are walling the burying ground.',
  'doing.raising.wall': 'They are setting the stone wall.',
  'doing.raising.stone_house': 'They are rebuilding a house in stone.',
  'doing.raising.church': 'They are raising the church.',
  'doing.raising.watchtower': 'They are raising the watchtower.',
  // U-06 · la línea de estación bajo el año (`src/ui/app.ts`, `seasonLabel`):
  // una clave por estación, nunca un literal junto a `seasonOf`.
  'app.season.spring': 'Spring',
  'app.season.summer': 'Summer',
  'app.season.autumn': 'Autumn',
  'app.season.winter': 'Winter',
  // U-09 · el botón de sonido, junto a la regleta de velocidad (`app.ts`). El
  // dibujo cambia solo; esto es lo que anuncia un lector de pantalla.
  'app.sound.on': 'Sound on',
  'app.sound.off': 'Sound off',
  // U-10 · el menú de inicio (`screens/title.ts`). Lo único que se configura
  // es el número del valle, porque la gracia del juego es comparar valles.
  'title.name': 'The Valley',
  'title.tagline': 'Two come over the ridge with a hen basket and a sack of grain. What the years make of them is not up to them alone.',
  'title.continue': 'Continue',
  'title.continue.detail': 'Year {year} · {count} living',
  'title.new': 'Found a new valley',
  'title.seed': 'Valley number',
  'title.seed.hint': 'The same number gives anyone the same valley to start with. Nobody leads it the same way.',
  'title.reroll': 'Another',
  // U-11 · el inicio guiado: dos pistas, una vez, después del vuelo de entrada.
  // Se tocan para pasar. No son un tutorial: dicen dónde están los dos mandos.
  'intro.orders': 'The line above is the standing orders: how much to sow, where spare hands go, what to raise first. Tap it when you want a change.',
  'intro.time': 'The button at the right sets the pace. The valley goes on by itself; come back whenever you like.',
  'crossroad.waiting': 'A crossroad is waiting',
  // U-07 · el texto visible de la píldora que reemplaza al punto rojo
  // (`screens/crossroad.ts`, `.crossroad-marker`). Distinto del aria-label de
  // arriba a propósito: éste es lo que se lee en pantalla, aquél lo que
  // anuncia un lector de pantalla, y no tenían por qué decir lo mismo.
  'crossroad.pending_pill': 'A decision waits',
  'welcome.title': 'While you were gone',
  'epitaph.title': 'The valley is empty',
  'epitaph.extinction': 'The last of them died in year {year}.',
  'epitaph.abandoned': 'The last households left in year {year}.',
  'epitaph.dispersed': 'The village broke apart in year {year}.',
  'epitaph.summary': '{years} years. {peak} people at its height.',
  'epitaph.chronicle': 'Read the chronicle',
  'epitaph.begin': 'Begin again',
  'chronicle.source': 'Valley chronicle',
  'chronicle.current': 'This valley',
  'chronicle.archived': 'Earlier valley {number} — {years} years, peak {peak}',
  'inspect.raised': 'Raised in ANNO {year}.',
  'inspect.granary': '{grain} grain of {capacity} capacity.',
  'inspect.house': '{people} people under this roof.',
  'inspect.house.named': '{people} people under this roof: {names}.',
  'inspect.role.empty': 'No {role} serves here.',
  'inspect.role.holder': '{name} serves here as {role}.',
  'inspect.villager': 'Villager {id}',
  'inspect.opinion.trusts': 'Trusts {name}: {value}.',
  'inspect.opinion.resents': 'Resents {name}: {value}.',
  'inspect.memory': '{memory} — ANNO {year}.',
  'inspect.age': '{age} winters old.',
  'inspect.traits.none': 'No named traits.',
  'inspect.gone': 'Gone',
  'inspect.terrain.people': '{people} people live in the valley.',
  // U-08 · la pantalla People (`src/ui/screens/people.ts`): la lista en sí no
  // lleva frase propia (usa `nav.people`, ya en el banco), sólo lo que le
  // falta a la ficha reusada: el vacío de una aldea sin nadie con nombre
  // todavía, y volver de una ficha a la lista.
  'people.empty': 'Nobody in the valley has a name yet.',
  'people.back': 'Back to the list',
  'role.leader': 'leader',
  'role.smith': 'smith',
  'role.midwife': 'midwife',
  'role.priest': 'priest',
  'role.woodward': 'woodward',
  'role.reeve': 'reeve',
  'role.herbalist': 'herbalist',
  'role.stranger': 'stranger',
  'terrain.meadow': 'meadow',
  'terrain.forest': 'forest',
  'terrain.water': 'water',
  'terrain.rock': 'rock',
  'terrain.marsh': 'marsh',
  'terrain.cleared': 'clearing',
  'terrain.land': 'land',
  'building.house': 'house',
  'building.field': 'field',
  'building.granary': 'granary',
  'building.chapel': 'chapel',
  'building.smithy': 'smithy',
  'building.well': 'well',
  'building.mill': 'mill',
  'building.palisade': 'palisade',
  'building.wall': 'wall',
  'building.church': 'church',
  'building.stone_house': 'stone house',
  'building.watchtower': 'watchtower',
  'building.grave_yard': 'graveyard',
  'trait.ambitious': 'ambitious',
  'trait.devout': 'devout',
  'trait.spiteful': 'spiteful',
  'trait.craven': 'craven',
  'trait.generous': 'generous',
  'trait.stubborn': 'stubborn',
  'trait.cunning': 'cunning',
  'trait.kind': 'kind',
  'trait.hot_tempered': 'hot tempered',
  'trait.frail': 'frail',
  'trait.hardy': 'hardy',
  'trait.greedy': 'greedy',
  'trait.loyal': 'loyal',
  'trait.proud': 'proud',
  'trait.secretive': 'secretive',
  'memory.lost_child': 'lost child',
  'memory.was_blamed': 'was blamed',
  'memory.was_saved': 'was saved',
  'memory.was_passed_over': 'was passed over',
  'memory.went_hungry': 'went hungry',
  'memory.lost_home': 'lost home',
  'memory.stole': 'stole',
  'memory.unspoken': 'unspoken',
};

for (const [key, variants] of Object.entries(CROSSROAD_CHRONICLE)) BANK[key] = variants;
