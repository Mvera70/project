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
  founding: [
    'Twenty came over the ridge and stopped where the river bends. Year one.',
    'They stopped here because the water was clean and no one owned it. Year one.',
    'Nobody wrote down why they stopped. Year one.',
    'Twenty of them, and a valley nobody had claimed. Year one.',
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

  // --- M-23 · welcome digest, design.md §9.2, §13.2 ---
  'welcome.time': [
    '{weeks} weeks passed.',
    'It has been {weeks} weeks.',
    '{weeks} weeks, and nobody was watching.',
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
};

/** Stable interface copy: unlike chronicle prose, labels do not vary by seed. */
export const UI_BANK: Record<string, string> = {
  'app.valley': 'The valley',
  'app.year': 'ANNO {year}',
  'app.speed.controls': 'Simulation speed',
  'app.speed.pause': 'Pause',
  'app.speed.multiplier': '{speed}×',
  'crossroad.waiting': 'A crossroad is waiting',
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
  'role.smith': 'smith',
  'role.priest': 'priest',
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
