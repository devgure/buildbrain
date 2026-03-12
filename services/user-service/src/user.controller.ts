import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/shared/auth/guards/jwt-auth.guard';
import { CurrentUser } from '@/shared/auth/decorators/current-user.decorator';
import { UserService } from './user.service';
import { User } from '@prisma/client';
import {
  UpdateProfileDto,
  UpdateSettingsDto,
  UpdatePreferencesDto,
  AddSkillDto,
  AddPortfolioItemDto,
  AddContactRuleDto,
  UserProfileResponseDto,
  UserSettingsResponseDto,
  UserPreferencesResponseDto,
  UserStatisticsResponseDto,
} from './user.dto';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get current user profile',
    description: 'Retrieve the authenticated user profile with all details',
  })
  @ApiOkResponse({
    description: 'User profile retrieved',
    type: UserProfileResponseDto,
  })
  async getCurrentUser(@CurrentUser() user: User): Promise<UserProfileResponseDto> {
    return this.userService.getUserProfile(user.id);
  }

  @Get(':userId')
  @ApiOperation({
    summary: 'Get user profile by ID',
    description: 'Retrieve any users profile (public data only)',
  })
  @ApiOkResponse({
    description: 'User profile retrieved',
    type: UserProfileResponseDto,
  })
  async getUserProfile(@Param('userId') userId: string): Promise<UserProfileResponseDto> {
    return this.userService.getUserProfile(userId);
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Update current user profile',
    description: 'Update name, phone, company, bio, avatar',
  })
  @ApiOkResponse({
    description: 'Profile updated',
  })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateDto: UpdateProfileDto,
  ) {
    return this.userService.updateProfile(user.id, updateDto);
  }

  @Get('me/settings')
  @ApiOperation({
    summary: 'Get user settings',
    description: 'Retrieve notification and preference settings',
  })
  @ApiOkResponse({
    description: 'Settings retrieved',
    type: UserSettingsResponseDto,
  })
  async getSettings(@CurrentUser() user: User): Promise<UserSettingsResponseDto> {
    return this.userService.getSettings(user.id);
  }

  @Patch('me/settings')
  @ApiOperation({
    summary: 'Update user settings',
  })
  @ApiOkResponse({
    description: 'Settings updated',
  })
  async updateSettings(
    @CurrentUser() user: User,
    @Body() updateDto: UpdateSettingsDto,
  ) {
    return this.userService.updateSettings(user.id, updateDto);
  }

  @Get('me/preferences')
  @ApiOperation({
    summary: 'Get user preferences',
    description: 'Retrieve theme, payment method, bidding preferences',
  })
  @ApiOkResponse({
    description: 'Preferences retrieved',
    type: UserPreferencesResponseDto,
  })
  async getPreferences(@CurrentUser() user: User): Promise<UserPreferencesResponseDto> {
    return this.userService.getPreferences(user.id);
  }

  @Patch('me/preferences')
  @ApiOperation({
    summary: 'Update user preferences',
  })
  @ApiOkResponse({
    description: 'Preferences updated',
  })
  async updatePreferences(
    @CurrentUser() user: User,
    @Body() updateDto: UpdatePreferencesDto,
  ) {
    return this.userService.updatePreferences(user.id, updateDto);
  }

  @Post('me/skills')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add skill to profile',
  })
  @ApiCreatedResponse({
    description: 'Skill added',
  })
  async addSkill(
    @CurrentUser() user: User,
    @Body() skillDto: AddSkillDto,
  ) {
    return this.userService.addSkill(user.id, skillDto);
  }

  @Get('me/skills')
  @ApiOperation({
    summary: 'Get user skills',
  })
  @ApiOkResponse({
    description: 'Skills retrieved',
  })
  async getSkills(@CurrentUser() user: User) {
    return this.userService.getSkills(user.id);
  }

  @Delete('me/skills/:skillId')
  @ApiOperation({
    summary: 'Remove skill from profile',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeSkill(
    @CurrentUser() user: User,
    @Param('skillId') skillId: string,
  ) {
    return this.userService.removeSkill(user.id, skillId);
  }

  @Get(':userId/reviews')
  @ApiOperation({
    summary: 'Get user reviews',
  })
  @ApiOkResponse({
    description: 'Reviews retrieved',
  })
  async getReviews(
    @Param('userId') userId: string,
    @Query('skip') skip: number = 0,
    @Query('take') take: number = 10,
  ) {
    return this.userService.getReviews(userId, skip, take);
  }

  @Get(':userId/rating')
  @ApiOperation({
    summary: 'Get user rating',
  })
  @ApiOkResponse({
    description: 'Rating retrieved',
  })
  async getRating(@Param('userId') userId: string) {
    const rating = await this.userService.getRating(userId);
    return { rating: rating.toNumber() };
  }

  @Post('me/portfolio')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add portfolio item',
  })
  @ApiCreatedResponse({
    description: 'Portfolio item added',
  })
  async addPortfolioItem(
    @CurrentUser() user: User,
    @Body() itemDto: AddPortfolioItemDto,
  ) {
    return this.userService.addPortfolioItem(user.id, itemDto);
  }

  @Get('me/portfolio')
  @ApiOperation({
    summary: 'Get user portfolio',
  })
  @ApiOkResponse({
    description: 'Portfolio retrieved',
  })
  async getPortfolio(@CurrentUser() user: User) {
    return this.userService.getPortfolio(user.id);
  }

  @Delete('me/portfolio/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove portfolio item',
  })
  async removePortfolioItem(
    @CurrentUser() user: User,
    @Param('itemId') itemId: string,
  ) {
    return this.userService.removePortfolioItem(itemId);
  }

  @Get('me/activity')
  @ApiOperation({
    summary: 'Get user activity timeline',
  })
  @ApiOkResponse({
    description: 'Activity retrieved',
  })
  async getActivity(
    @CurrentUser() user: User,
    @Query('skip') skip: number = 0,
    @Query('take') take: number = 20,
  ) {
    return this.userService.getActivity(user.id, skip, take);
  }

  @Post('me/contact-rules')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Add contact rule',
    description: 'e.g., no contact after 6pm, weekends only, etc.',
  })
  @ApiCreatedResponse({
    description: 'Contact rule added',
  })
  async addContactRule(
    @CurrentUser() user: User,
    @Body() ruleDto: AddContactRuleDto,
  ) {
    return this.userService.addContactRule(user.id, ruleDto);
  }

  @Get('me/contact-rules')
  @ApiOperation({
    summary: 'Get contact rules',
  })
  @ApiOkResponse({
    description: 'Rules retrieved',
  })
  async getContactRules(@CurrentUser() user: User) {
    return this.userService.getContactRules(user.id);
  }

  @Get('search/:query')
  @ApiOperation({
    summary: 'Search users by name or company',
  })
  @ApiOkResponse({
    description: 'Users found',
  })
  async searchUsers(
    @Param('query') query: string,
    @Query('skip') skip: number = 0,
    @Query('take') take: number = 10,
  ) {
    return this.userService.searchUsers(query, skip, take);
  }

  @Get('me/statistics')
  @ApiOperation({
    summary: 'Get user statistics',
    description: 'Dashboard metrics based on user role',
  })
  @ApiOkResponse({
    description: 'Statistics retrieved',
    type: UserStatisticsResponseDto,
  })
  async getStatistics(@CurrentUser() user: User): Promise<UserStatisticsResponseDto> {
    return this.userService.getStatistics(user.id);
  }

  @Get(':userId/certifications')
  @ApiOperation({
    summary: 'Get user certifications',
  })
  @ApiOkResponse({
    description: 'Certifications retrieved',
  })
  async getCertifications(@Param('userId') userId: string) {
    return this.userService.getCertifications(userId);
  }
}
