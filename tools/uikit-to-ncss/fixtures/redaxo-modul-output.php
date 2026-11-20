<?php
// REDAXO-Modul "Teaser mit Modal" - Ausgabe
$id = 'teaser-' . $this->getCurrentSlice()->getId();
$media = rex_media::get('REX_MEDIA[1]');
?>
<section class="uk-section <?= 'REX_VALUE[3]' === 'dunkel' ? 'uk-section-secondary uk-light' : 'uk-section-default' ?>">
  <div class="uk-container">
    <?php if ('REX_VALUE[1]' !== ''): ?>
    <h2 class="uk-heading-line uk-text-center"><span>REX_VALUE[1]</span></h2>
    <?php endif; ?>
    <div class="uk-grid-large uk-flex-middle" uk-grid>
      <div class="uk-width-1-2@m">
        <?php if ($media): ?>
        <img src="<?= rex_url::media($media->getFileName()) ?>" alt="<?= rex_escape($media->getTitle()) ?>" class="uk-border-rounded uk-box-shadow-large">
        <?php endif; ?>
      </div>
      <div class="uk-width-1-2@m">
        <div class="uk-text-lead">REX_VALUE[id=2 output=html]</div>
        <a class="uk-button uk-button-primary" href="#<?= $id ?>" uk-toggle>Details <span uk-icon="arrow-right"></span></a>
        <?php echo '<span class="uk-label">' . rex_escape('REX_VALUE[4]') . '</span>'; ?>
      </div>
    </div>
  </div>
</section>
<div id="<?= $id ?>" class="uk-modal-full" uk-modal>
  <div class="uk-modal-dialog uk-modal-body">
    <button class="uk-modal-close-full uk-close-large" type="button" uk-close></button>
    <h2 class="uk-modal-title">REX_VALUE[1]</h2>
    REX_VALUE[id=5 output=html]
  </div>
</div>
