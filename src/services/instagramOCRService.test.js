import { instagramOCRService } from './instagramOCRService';

// Instagram renamed "Impressions" -> "Views" and "Accounts reached" -> "Viewers".
// Both layouts still land in the same two fields: views (total) and
// accountsReached (unique). These lock that in for the OCR fallback path.

const parse = (text) => instagramOCRService.parseInstagramMetrics(text);

describe('parseInstagramMetrics — Views vs Viewers', () => {
  it('reads both numbers from the newest layout', () => {
    const m = parse('Views\n812,197\n+15.2%\nViewers\n5,626\n+8.1%\nProfile visits\n1,204');
    expect(m.views).toBe(812197);
    expect(m.accountsReached).toBe(5626);
  });

  it('reads the legacy layout into the same two fields', () => {
    const m = parse('Accounts reached\n5,626\nImpressions\n812,197');
    expect(m.views).toBe(812197);
    expect(m.accountsReached).toBe(5626);
  });

  it('does not mistake "Profile views" for total Views', () => {
    const m = parse('Profile views\n1,204\nViews\n812,197\nViewers\n5,626');
    expect(m.views).toBe(812197);
    expect(m.accountsReached).toBe(5626);
  });

  it('leaves views unset when only Profile views is on screen', () => {
    expect(parse('Profile views\n1,204').views).toBeUndefined();
  });

  it('does not let "Viewers" fill in the Views total', () => {
    const m = parse('Viewers\n5,626\n+8.1%');
    expect(m.accountsReached).toBe(5626);
    expect(m.views).toBeUndefined();
  });

  it('does not let "Views" fill in the unique-accounts number', () => {
    const m = parse('Views\n812,197\n+15.2%');
    expect(m.views).toBe(812197);
    expect(m.accountsReached).toBeUndefined();
  });
});
