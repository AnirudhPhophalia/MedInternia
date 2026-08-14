import { Response } from 'express';
import { reviewFlashcard } from '../flashcardController';
import Flashcard from '../../models/Flashcard';

jest.mock('../../models/Flashcard');

const mockedFlashcard = Flashcard as jest.Mocked<typeof Flashcard>;

const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

const mockRequest = (quality: number) => ({
  params: { id: 'card-1' },
  body: { quality },
  user: { id: 'user-1' },
});

describe('flashcard review scheduling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('updates scheduling through an atomic version-guarded query', async () => {
    const existingCard = {
      _id: 'card-1',
      user: 'user-1',
      interval: 1,
      repetitions: 0,
      easeFactor: 2.5,
      __v: 3,
    };
    const reviewedCard = {
      ...existingCard,
      repetitions: 1,
      __v: 4,
    };
    mockedFlashcard.findOne.mockResolvedValue(existingCard as any);
    mockedFlashcard.findOneAndUpdate.mockResolvedValue(reviewedCard as any);
    const res = mockResponse();

    await reviewFlashcard(mockRequest(4) as any, res);

    expect(mockedFlashcard.findOneAndUpdate).toHaveBeenCalledWith(
      { _id: 'card-1', user: 'user-1', __v: 3 },
      {
        $set: expect.objectContaining({
          interval: 1,
          repetitions: 1,
          easeFactor: expect.any(Number),
          nextReview: expect.any(Date),
        }),
        $inc: { __v: 1 },
      },
      { new: true, runValidators: true }
    );
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: reviewedCard });
  });

  it('returns a conflict when another review already changed the card', async () => {
    mockedFlashcard.findOne.mockResolvedValue({
      _id: 'card-1',
      user: 'user-1',
      interval: 6,
      repetitions: 2,
      easeFactor: 2.3,
      __v: 8,
    } as any);
    mockedFlashcard.findOneAndUpdate.mockResolvedValue(null);
    const res = mockResponse();

    await reviewFlashcard(mockRequest(5) as any, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      message: 'Flashcard review was already updated. Refresh and try again.',
    });
  });
});
