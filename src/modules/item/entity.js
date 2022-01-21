import ReactiveDialog from '../apps/reactiveDialog';

import ItemActivationDialog from '../../vue/ItemActivationDialog.vue';

/**
 * Override and extend the basic Item implementation.
 * @extends {Item}
 */
export default class Item5e extends Item {
  static chatListeners(html) {
    html.find('.a5e-js-chat-ability-check-button').click(this._onClickChatAbilityCheckButton.bind(this));
    html.find('.a5e-js-chat-saving-throw-button').click(this._onClickChatSavingThrowButton.bind(this));
    html.find('.a5e-js-toggle-roll-tooltip-visibility').click(this._onToggleRollTooltipVisibility.bind(this));
  }

  async activate() {
    const itemData = this.data.data;
    let attack;
    let damage;
    let healing;

    const dialogTitle = game.i18n.format(
      'A5E.ItemActivationPrompt',
      { name: this.actor.name, itemName: this.name }
    );

    const dialog = new ReactiveDialog(ItemActivationDialog, {
      title: dialogTitle, props: { actor: this.actor, item: this }
    });

    const data = {
      id: this.id,
      img: this.img,
      title: this.name,
      description: itemData.description,
      actionOptions: itemData.actionOptions,
      isCrit: null,
      isFumble: null,
      attack: null,
      damage: null,
      healing: null,
      abilityCheck: {
        ...itemData.check,
        label: game.i18n.format(
          'A5E.RollPromptAbilityCheck',
          { ability: game.i18n.localize(CONFIG.A5E.abilities[itemData.check.ability]) }
        )
      },
      savingThrow: {
        ...itemData.save,
        label: game.i18n.format(
          'A5E.RollPromptSavingThrow',
          { ability: game.i18n.localize(CONFIG.A5E.abilities[itemData.save.targetAbility]) }
        )
      }
    };

    if (['attack', 'damage', 'healing'].some((option) => itemData.actionOptions.includes(option))) {
      await dialog.render(true);

      try {
        const configuration = await dialog.promise;
        attack = configuration.attack;
        damage = configuration.damage;
        healing = configuration.healing;
      } catch {
        return;
      }
    }

    if (itemData.actionOptions.includes('attack')) {
      const roll = new CONFIG.Dice.D20Roll(attack.formula, this.getRollData());
      await roll.evaluate({ async: true });

      data.isCrit = roll.dice[0].total >= itemData.attack.critThreshold;
      data.isFumble = roll.dice[0].total === 1;

      const tooltip = await roll.getTooltip();

      data.attack = {
        roll,
        tooltip
      };
    }

    if (itemData.actionOptions.includes('damage')) {
      data.damage = [];

      // TODO: Refactor this to stop eslint complaining
      for (const { canCrit, damageType, formula } of damage) {
        const roll = new CONFIG.Dice.DamageRoll(
          formula || '0',
          this.getRollData(),
          { canCrit, isCrit: data.isCrit }
        );

        await roll.evaluate({ async: true });
        const tooltip = await roll.getTooltip();

        data.damage.push({
          damageType, roll, tooltip
        });
      }
    }

    if (itemData.actionOptions.includes('healing')) {
      data.healing = [];

      // TODO: Refactor this to stop eslint complaining
      for (const { healingType, formula } of healing) {
        const roll = new CONFIG.Dice.DamageRoll(
          formula || '0',
          this.getRollData(),
          { canCrit: false }
        );

        await roll.evaluate({ async: true });
        const tooltip = await roll.getTooltip();

        data.healing.push({
          healingType, roll, tooltip
        });
      }
    }

    this.actor.constructItemCard(data);
  }

  static async _onClickChatAbilityCheckButton(event) {
    /* eslint-disable no-await-in-loop, no-restricted-syntax */
    event.preventDefault();

    const { ability } = event.currentTarget.dataset;
    const targets = this._getChatCardTargets();

    for (const token of targets) {
      await token.actor.rollAbilityCheck(ability);
    }
  }

  static async _onClickChatSavingThrowButton(event) {
    event.preventDefault();

    const { ability } = event.currentTarget.dataset;
    const targets = this._getChatCardTargets();

    for (const token of targets) {
      await token.actor.rollSavingThrow(ability);
    }
  }

  /**
   * Find the currently selected tokens on the canvas.
   *
   * @returns {Actor[]} An Array of Actor documents, if any
   * @private
   */
  static _getChatCardTargets() {
    let targets = canvas.tokens.controlled.filter((target) => !!target.actor);

    if (!targets.length && game.user.character) {
      targets = targets.concat(game.user.character.getActiveTokens());
    }

    if (!targets.length) {
      ui.notifications.warn(game.i18n.localize('A5E.ActionWarningNoSelectedTokens'));
    }

    return targets;
  }

  static _onToggleRollTooltipVisibility(event) {
    event.preventDefault();

    const tooltip = Array.from($(event.currentTarget).siblings('.a5e-dice-tooltip'))[0];
    $(tooltip).slideToggle();
  }
}
