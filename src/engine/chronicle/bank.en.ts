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
    'It started in one house and did not stay there. {season}, year {year}.',
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
