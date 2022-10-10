-- A world of kittehs, loving each other (or not). Let the drama begin.
sig Kitteh { love: set Kitteh }
sig Imposter {}

-- does k1 love k2?
pred inLoveWith[k1, k2: Kitteh] { k2 in k1.love }

pred selfLove[k: Kitteh] { k.inLoveWith[k] }

-- Does k1 and only k1 love k2?
pred onlyLoverOf[k1, k2: Kitteh] {
	all k: Kitteh |
	    k.inLoveWith[k2] iff k = k1
}

-- Does k2 love k1 and only k1?
pred onlyBelovedOf[k1, k2: Kitteh] {
  all k: Kitteh |
      k2.inLoveWith[k] iff k = k1
}

-- Every kitteh has another kitteh who he loves and who loves him back
pred loveStory {
	all k1: Kitteh |
		some k2: Kitteh-k1 |
			k1.inLoveWith[k2] and k2.inLoveWith[k1]
}

-- There are two different kittehs who love the same kitteh, but who don't love each other
pred rivals {
	some k1: Kitteh |
		some k2: Kitteh-k1 |
			some k3: Kitteh-k1-k2 |
				k2.inLoveWith[k1] and k3.inLoveWith[k1]
				and not k2.inLoveWith[k3] and not k3.inLoveWith[k2]
}

-- Every kitteh loves itself but loves no other kitteh
pred narcissists {
	all k1: Kitteh |
		k1.onlyBelovedOf[k1]
}

-- There is a kitteh who all kittehs love, but who loves no kitteh (except itself)
pred sociopath {
// @shakudo-edit sociopath
// @shakudo-define_sig Kitteh Imposter
// @shakudo-define_pred_inline selfLove Kitteh
// @shakudo-define_pred_inline inLoveWith Kitteh Kitteh
// @shakudo-define_pred_inline onlyLoverOf Kitteh Kitteh
all item: Kitteh {
  selfLove[item]
}
// @shakudo-text
}

-- Every kitteh loves exactly one Kitteh: either Ginger or Fluffy.
pred rockstars {
	some Ginger: Kitteh |
		some Fluffy: Kitteh - Ginger |
			all k1: Kitteh |
				Ginger.onlyBelovedOf[k1] or Fluffy.onlyBelovedOf[k1]
}

-- Each kitteh loves exactly one kitteh and is loved by exactly one kitteh
pred oneLove {
	--note that "loves one and is loved by one" could mean a cat loves one cat and is loved by another
	--also note that a kitteh that loves itself satisfies the above conditions
	all k1: Kitteh |
		some k2: Kitteh |
			some k3: Kitteh |
				k1.onlyLoverOf[k2] and k1.onlyBelovedOf[k3]
}

pred allSociopaths {
  -- Is it possible for all kittehs to be sociopaths?
  -- Alter the sociopath predicate and find out.
  -- Describe what models (if any) satisfy this constraint.

  -- your code here

  -- your description here (add as a comment)
  // @shakudo-edit allSociopaths
  // @shakudo-define_sig Kitteh Imposter
  // @shakudo-define_pred_inline selfLove Kitteh
  // @shakudo-define_pred_inline inLoveWith Kitteh Kitteh
  // @shakudo-define_pred_inline onlyLoverOf Kitteh Kitteh
no item: Kitteh {
  selfLove[item]
}
  // @shakudo-text
}

-- Every kitteh loves my baby, but my baby loves nobody but me.
pred myBaby {
	some me: Kitteh |
		some myBaby: Kitteh |
			(all k: Kitteh | k.inLoveWith[myBaby])
			and me.onlyBelovedOf[myBaby]

	-- What do you notice about all models that satisfy myBaby?

	-- Your description here (add as a comment)
}

-- A more accurate interpretation of the song lyric...
pred realMyBaby {
	some me: Kitteh |
		some myBaby: Kitteh-me |
			(all k: Kitteh-myBaby | k.inLoveWith[myBaby])
			and me.onlyBelovedOf[myBaby]

	-- What is different about this revised version?
	-- Why does it give results that are more accurate?

	-- Your explanation here (add as a comment)
}

pred kittehLove {
// @shakudo-run
// @shakudo-repl_cmd sociopath sociopath
// @shakudo-repl_cmd allSociopaths allSociopaths
	-- sociopath -- Replace this with the name of any predicate you want to test.
// @shakudo-text
}
run kittehLove for 10 Kitteh, 0 Imposter  -- Search for kitteh-worlds of size 10 or smaller (you can change this)
